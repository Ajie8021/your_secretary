
const { REMINDER_STATUS, canProcessReminder } = require('./reminder-state');

// 领取任务后，默认锁定 2 分钟。
// 如果云函数执行异常退出，锁过期后任务可以再次被领取。
const DEFAULT_LOCK_MS = 2 * 60 * 1000;

/**
 * 原子领取一条提醒任务。
 *
 * @param {Object} db 微信云开发数据库实例
 * @param {string} taskId tasks 集合中的文档 ID
 * @param {Date} now 当前时间
 * @param {number} lockMs 锁定时长，单位毫秒
 * @returns {Promise<Object|null>}
 *   返回领取成功后的任务信息；不能领取时返回 null。
 */
async function claimReminderTask(
  db,
  taskId,
  now = new Date(),
  lockMs = DEFAULT_LOCK_MS
) {
  if (!db || typeof db.runTransaction !== 'function') {
    throw new TypeError('db 必须支持 runTransaction');
  }

  if (typeof taskId !== 'string' || !taskId.trim()) {
    throw new TypeError('taskId 必须是非空字符串');
  }

  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TypeError('now 必须是有效的 Date 对象');
  }

  if (!Number.isFinite(lockMs) || lockMs <= 0) {
    throw new TypeError('lockMs 必须是正数');
  }

  return db.runTransaction(async (transaction) => {
    const taskRef = transaction.collection('tasks').doc(taskId);
    const result = await taskRef.get();

    // 兼容文档不存在或查询结果没有 data 的情况。
    const task = result && result.data;
    if (!task) {
      return null;
    }

    // 仅允许领取已经到提醒时间的任务。
    // remindAt 在现有项目中可能保存为 ISO 时间字符串，
    // 因此这里统一转换成 Date 进行比较。
    if (!task.remindAt) {
      return null;
    }

    const remindAt = new Date(task.remindAt);
    if (
      Number.isNaN(remindAt.getTime()) ||
      remindAt.getTime() > now.getTime()
    ) {
      return null;
    }

    // 检查是否已发送、已完成，或仍被其他执行实例锁定。
    if (!canProcessReminder(task, now)) {
      return null;
    }

    const attempts = Number.isInteger(task.reminderAttempts)
      ? task.reminderAttempts
      : 0;

    const lockUntil = new Date(now.getTime() + lockMs);

    await taskRef.update({
      data: {
        reminderStatus: REMINDER_STATUS.PROCESSING,
        reminderLockUntil: lockUntil.toISOString(),
        reminderAttempts: attempts + 1,
        reminderUpdatedAt: now.toISOString()
      }
    });

    return {
      ...task,
      reminderStatus: REMINDER_STATUS.PROCESSING,
      reminderLockUntil: lockUntil.toISOString(),
      reminderAttempts: attempts + 1,
      reminderUpdatedAt: now.toISOString()
    };
  });
}

module.exports = {
  DEFAULT_LOCK_MS,
  claimReminderTask
};
