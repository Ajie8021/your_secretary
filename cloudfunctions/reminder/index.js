
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
 * 当前阶段尚未接入微信订阅消息。
 * 显式失败，避免把未发送的消息当作成功。
 *
 * 下一步会将其替换为真实的订阅消息发送实现。
 */
async function sendReminder() {
  const error = new Error('订阅消息发送接口尚未配置');
  error.stage = 'send';
  throw error;
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
exports.main = async () => {
  const now = new Date();

  console.log('[sendReminder] 扫描开始', {
    scanTime: now.toISOString()
  });

  try {
    const tasks = await findDueTasks(now);

    const result = await processDueReminders({
      tasks,
      now,
      limit: QUERY_LIMIT,
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
