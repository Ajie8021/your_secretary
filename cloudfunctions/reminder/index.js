
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

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 单次查询的最大任务数量，避免一次读取过多数据。
const QUERY_LIMIT = 100;

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
 * 发送成功后更新任务的提醒状态。
 *
 * 目前只在消息发送成功后调用。
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
        reminded: true
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
      tasks = [task];

      console.log('[sendReminder] 定向测试模式', {
        taskId: event.testTaskId
      });
    } else {
      tasks = await findDueTasks(now);
    }

    const result = await processDueReminders({
      tasks,
      now,
      limit: event && event.testTaskId ? 1 : QUERY_LIMIT,
      sendReminder,
      markReminded
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
