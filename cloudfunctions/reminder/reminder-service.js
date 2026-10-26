
const { isReminderDue } = require('./reminder-rules');

/**
 * 处理一批候选提醒任务。
 *
 * 所有数据库操作和消息发送操作都通过参数传入，
 * 因此服务层可以脱离微信云环境进行单元测试。
 *
 * @param {Object} options 配置对象
 * @param {Array} options.tasks 候选任务
 * @param {Date|string|number} options.now 当前时间
 * @param {number} options.limit 本批最多检查的任务数
 * @param {Function} options.claimReminder 领取任务
 * @param {Function} options.sendReminder 发送订阅消息
 * @param {Function} options.markReminded 标记发送成功
 * @param {Function} options.markFailed 记录发送失败
 */
async function processDueReminders({
  tasks,
  now = new Date(),
  limit = 50,
  claimReminder = async task => task,
  sendReminder,
  markReminded,
  markFailed = async () => {}
}) {
  if (!Array.isArray(tasks)) {
    throw new TypeError('tasks 必须是数组');
  }

  if (!Number.isInteger(limit) || limit < 1) {
    throw new TypeError('limit 必须是大于 0 的整数');
  }

  if (typeof claimReminder !== 'function') {
    throw new TypeError('claimReminder 必须是函数');
  }

  if (typeof sendReminder !== 'function') {
    throw new TypeError('sendReminder 必须是函数');
  }

  if (typeof markReminded !== 'function') {
    throw new TypeError('markReminded 必须是函数');
  }

  if (typeof markFailed !== 'function') {
    throw new TypeError('markFailed 必须是函数');
  }

  // 先筛选到期任务，再限制本轮检查数量。
  const dueTasks = tasks.filter(task => isReminderDue(task, now));
  const batch = dueTasks.slice(0, limit);

  const result = {
    candidateCount: tasks.length,
    dueCount: dueTasks.length,
    processedCount: 0,
    skippedCount: 0,
    successCount: 0,
    failureCount: 0,
    failures: []
  };

  for (const task of batch) {
    let claimedTask;

    // 第一步：领取任务。
    try {
      claimedTask = await claimReminder(task);
    } catch (error) {
      result.failureCount++;
      result.failures.push({
        taskId: task && task._id ? task._id : null,
        stage: 'claim',
        message: error && error.message
          ? error.message
          : String(error)
      });
      continue;
    }

    // 任务可能已经被其他实例领取、发送或完成。
    if (!claimedTask) {
      result.skippedCount++;
      continue;
    }

    result.processedCount++;

    // 第二步：发送消息。
    try {
      await sendReminder(claimedTask);
    } catch (error) {
      result.failureCount++;

      const failure = {
        taskId: claimedTask._id || null,
        stage: error && error.stage ? error.stage : 'send',
        message: error && error.message
          ? error.message
          : String(error)
      };

      result.failures.push(failure);

      // 只有发送阶段失败，才记录发送失败并安排重试。
      try {
        await markFailed(claimedTask, error);
      } catch (updateError) {
        // 如果连失败状态也无法保存，锁最终过期后才有机会恢复。
        result.failures.push({
          taskId: claimedTask._id || null,
          stage: 'mark-failed',
          message: updateError && updateError.message
            ? updateError.message
            : String(updateError)
        });
      }

      continue;
    }

    // 第三步：消息发送成功后，写入已发送状态。
    try {
      await markReminded(claimedTask);
      result.successCount++;
    } catch (error) {
      // 重要：消息已经发送成功，不能将它当作发送失败立即重试。
      // 数据库更新失败时保留 processing 状态，等待锁过期后恢复。
      result.failureCount++;
      result.failures.push({
        taskId: claimedTask._id || null,
        stage: 'mark-sent',
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
