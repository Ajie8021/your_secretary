
const cloud = require('wx-server-sdk');

const {
  isReminderDue
} = require('./reminder-rules');

const {
  processDueReminders
} = require('./reminder-service');

const {
  buildDueTaskQuery
} = require('./reminder-query');

const {
  sendSubscriptionMessage
} = require('./subscription-message');

const {
  TEMPLATE_ID,
  TEMPLATE_FIELD_MAP,
  MESSAGE_PAGE
} = require('./reminder-config');

const {
  claimReminderTask,
  MAX_REMINDER_ATTEMPTS,
  RETRY_DELAY_MS
} = require('./reminder-store');

const {
  collectDueTaskPages
} = require('./reminder-pagination');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 单次数据库查询最多读取 100 条。
const QUERY_LIMIT = 100;

// 每次云函数调用最多扫描 5 页，限制单次执行耗时。
const MAX_SCAN_BATCHES = 5;

// 每次定时触发最多检查 500 条候选任务。
const MAX_SCAN_TASKS = QUERY_LIMIT * MAX_SCAN_BATCHES;

/**
 * 查询到期且尚未提醒的任务。
 *
 * @param {Date} now 本次扫描时间
 * @returns {Promise<Array>} 候选任务列表
 */
async function findDueTasks(now) {
  const query = buildDueTaskQuery(_, now);

  const response = await db.collection('tasks')
    .where(query)
    .orderBy('remindAt', 'asc')
    .limit(QUERY_LIMIT)
    .get();

  // 查询结果仍须经过提醒规则过滤。
  return response.data.filter(task => isReminderDue(task, now));
}

/**
 * 根据任务 ID 查询单条任务。
 *
 * 仅用于定向联调，避免手动测试时扫描所有到期任务。
 */
async function findTaskById(taskId) {
  if (typeof taskId !== 'string' || !taskId.trim()) {
    throw new TypeError('测试任务 ID 不能为空');
  }

  const response = await db.collection('tasks')
    .doc(taskId)
    .get();

  return response.data;
}

/**
 * 向任务所属用户发送微信订阅消息。
 *
 * 注意：
 * 1. 接收人取自数据库任务记录的 _openid；
 * 2. 模板 ID 和字段必须事先配置正确；
 * 3. 只有微信接口调用成功后，处理流程才会继续更新 reminded。
 */
async function sendReminder(task) {
  if (!task || !task._openid) {
    const error = new Error('任务缺少 _openid，无法确定接收用户');
    error.stage = 'send';
    throw error;
  }

  if (!TEMPLATE_ID) {
    const error = new Error('尚未配置 REMINDER_TEMPLATE_ID');
    error.stage = 'send';
    throw error;
  }

  if (!Object.keys(TEMPLATE_FIELD_MAP).length) {
    const error = new Error('尚未配置订阅消息模板字段');
    error.stage = 'send';
    throw error;
  }

  return sendSubscriptionMessage({
    // 使用微信云开发提供的订阅消息发送接口。
    sendApi: payload => cloud.openapi.subscribeMessage.send(payload),
    openid: task._openid,
    templateId: TEMPLATE_ID,
    task,
    fieldMap: TEMPLATE_FIELD_MAP,
    page: MESSAGE_PAGE
  });
}


/**
 * 查询一页到期且尚未提醒的任务。
 *
 * @param {Date} now 当前扫描时间
 * @param {number} offset 分页偏移量
 * @param {number} limit 本页数量
 * @returns {Promise<Array>} 本页到期任务
 */
async function findDueTaskPage(now, offset, limit) {
  const query = buildDueTaskQuery(_, now);

  const response = await db.collection('tasks')
    .where(query)
    // 使用稳定排序，减少分页过程中任务顺序变化带来的影响。
    .orderBy('remindAt', 'asc')
    .orderBy('_id', 'asc')
    .skip(offset)
    .limit(limit)
    .get();

  // 返回数据库原始分页结果。
  // 分页是否结束应根据数据库原始结果判断。
  return response.data;
}

/**
 * 分页收集本轮需要检查的到期任务。
 *
 * 每次最多读取 MAX_SCAN_BATCHES 页。
 */
async function findDueTasksInBatches(now) {
  return collectDueTaskPages({
    now,
    batchSize: QUERY_LIMIT,
    maxBatches: MAX_SCAN_BATCHES,
    queryPage: (offset, limit) =>
      findDueTaskPage(now, offset, limit)
  });
}

/**
 * 发送成功后，将任务标记为已提醒。
 *
 * 只有数据库更新成功后，才算本地状态完成。
 * 
 * @param {Object} task 任务记录
 */
async function markReminded(task) {
  if (!task || !task._id) {
    throw new Error('任务缺少 _id，无法更新提醒状态');
  }

  await db.collection('tasks')
    .doc(task._id)
    .update({
      data: {
        reminded: true,
        reminderStatus: 'sent',
        reminderLockUntil: null,
        reminderNextRetryAt: null,
        reminderLastError: null,
        reminderUpdatedAt: new Date().toISOString()
      }
    });
}

/**
 * 发送失败后记录错误，并计算下次重试时间。
 *
 * 达到最大尝试次数后，不再安排自动重试。
 */
async function markFailed(task, error) {
  if (!task || !task._id) {
    throw new Error('任务缺少 _id，无法记录提醒失败');
  }

  const attempts = Number.isInteger(task.reminderAttempts)
    ? task.reminderAttempts
    : 1;

  const exhausted = attempts >= MAX_REMINDER_ATTEMPTS;
  const nextRetryAt = exhausted
    ? null
    : new Date(Date.now() + RETRY_DELAY_MS).toISOString();

  // 只保留简短错误信息，避免把过长的异常写入数据库。
  const errorMessage = String(
    error && error.message ? error.message : error
  ).slice(0, 500);

  await db.collection('tasks')
    .doc(task._id)
    .update({
      data: {
        reminded: false,
        reminderStatus: 'failed',
        reminderLockUntil: null,
        reminderNextRetryAt: nextRetryAt,
        reminderLastError: errorMessage,
        reminderUpdatedAt: new Date().toISOString()
      }
    });
}

/**
 * 云函数入口。
 * 由定时触发器调用，不需要小程序页面传入任务数据。
 */
exports.main = async (event = {}) => {
  const now = new Date();

  console.log('[sendReminder] 扫描开始', {
    scanTime: now.toISOString()
  });

  try {
    let tasks;

    // 传入 testTaskId 时，只查询指定任务，用于真实消息联调。
    // 没有传入时，执行原有的到期任务扫描逻辑。
    if (event && event.testTaskId) {
      const task = await findTaskById(event.testTaskId);
    
      // 文档不存在时返回空候选列表，避免将 undefined 放入任务数组。
      tasks = task ? [task] : [];
    
      console.log('[sendReminder] 定向测试模式', {
        taskId: event.testTaskId
      });
    } else {
      // 普通定时触发使用分页扫描。
      tasks = await findDueTasksInBatches(now);
    }

    const result = await processDueReminders({
      tasks,
      now,
      limit: event && event.testTaskId ? 1 : MAX_SCAN_TASKS,
    
      // 发送前必须先通过事务领取任务。
      claimReminder: task => claimReminderTask(db, task._id, now),
      // 发送微信订阅消息。
      sendReminder,
      // 发送成功后持久化成功状态。
      markReminded,
      // 发送失败后记录错误，并安排有限重试。
      markFailed
    });

    console.log('[sendReminder] 扫描结束', result);

    return {
      code: 0,
      message: '提醒任务扫描完成',
      data: result
    };
  } catch (error) {
    console.error('[sendReminder] 扫描失败', {
      message: error.message,
      stack: error.stack
    });

    return {
      code: 500,
      message: '提醒任务扫描失败',
      data: null
    };
  }
};

module.exports.findDueTasks = findDueTasks;
module.exports.markReminded = markReminded;
module.exports.findTaskById = findTaskById;
module.exports.markFailed = markFailed;
module.exports.findDueTaskPage = findDueTaskPage;
module.exports.findDueTasksInBatches = findDueTasksInBatches;
