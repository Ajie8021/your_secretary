
const { isReminderDue } = require('./reminder-rules');

/**
 * 处理一批候选提醒任务。
 *
 * 本模块不直接操作云数据库，也不直接发送微信消息。
 * 这些操作通过参数传入，便于独立测试。
 *
 * @param {Object} options 配置对象
 * @param {Array} options.tasks 候选任务数组
 * @param {Date|string|number} options.now 当前时间
 * @param {number} options.limit 单次最多处理的任务数
 * @param {Function} options.sendReminder 发送提醒的异步函数
 * @param {Function} options.markReminded 将任务标记为已提醒的异步函数
 * @returns {Promise<Object>} 本批次的处理统计结果
 */
async function processDueReminders({
  tasks,
  now = new Date(),
  limit = 50,
  sendReminder,
  markReminded
}) {
  if (!Array.isArray(tasks)) {
    throw new TypeError('tasks 必须是数组');
  }

  if (!Number.isInteger(limit) || limit < 1) {
    throw new TypeError('limit 必须是大于 0 的整数');
  }

  if (typeof sendReminder !== 'function') {
    throw new TypeError('sendReminder 必须是函数');
  }

  if (typeof markReminded !== 'function') {
    throw new TypeError('markReminded 必须是函数');
  }

  // 先筛选到期任务，再限制本批次的处理数量。
  const dueTasks = tasks.filter(task => isReminderDue(task, now));
  const batch = dueTasks.slice(0, limit);

  const result = {
    candidateCount: tasks.length,
    dueCount: dueTasks.length,
    processedCount: 0,
    successCount: 0,
    failureCount: 0,
    failures: []
  };

  // 使用顺序处理，避免一次启动大量消息发送请求。
  for (const task of batch) {
    result.processedCount++;

    try {
      // 第一步：发送消息。
      await sendReminder(task);

      // 第二步：发送成功后，再更新提醒状态。
      await markReminded(task);

      result.successCount++;
    } catch (error) {
      // 单个任务失败不应阻断本批次其他任务。
      result.failureCount++;

      result.failures.push({
        taskId: task && task._id ? task._id : null,
        stage: error && error.stage
          ? error.stage
          : 'send-or-update',
        message: error && error.message
          ? error.message
          : String(error)
      });
    }
  }

  return result;
}

module.exports = {
  processDueReminders
};
