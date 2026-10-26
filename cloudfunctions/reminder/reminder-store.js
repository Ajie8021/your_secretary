const {
  REMINDER_STATUS,
  canProcessReminder
} = require('./reminder-state');

// 领取成功后，锁定两分钟。
const DEFAULT_LOCK_MS = 2 * 60 * 1000;

// 每条任务最多尝试发送三次，包括第一次发送。
const MAX_REMINDER_ATTEMPTS = 3;

// 发送失败后，至少等待五分钟再重试。
const RETRY_DELAY_MS = 5 * 60 * 1000;

/**
 * 在事务中领取到期提醒任务。
 *
 * @returns {Promise<Object|null>}
 * 领取成功返回更新后的任务；不符合条件时返回 null。
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

  return db.runTransaction(async transaction => {
    const taskRef = transaction.collection('tasks').doc(taskId);
    const response = await taskRef.get();
    const task = response && response.data;

    if (!task) {
      return null;
    }

    // 不处理已经提醒或已经完成的任务。
    if (task.reminded === true || task.completed === true) {
      return null;
    }

    // 不处理无效提醒时间或尚未到期的任务。
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

    const attempts = Number.isInteger(task.reminderAttempts)
      ? task.reminderAttempts
      : 0;

    // 达到最大尝试次数后，不再自动重试。
    if (attempts >= MAX_REMINDER_ATTEMPTS) {
      return null;
    }

    // 失败任务必须等到重试时间才能重新领取。
    if (task.reminderNextRetryAt) {
      const nextRetryAt = new Date(task.reminderNextRetryAt);

      if (
        Number.isNaN(nextRetryAt.getTime()) ||
        nextRetryAt.getTime() > now.getTime()
      ) {
        return null;
      }
    }

    // 复用已完成的状态规则，包括旧记录兼容和锁过期判断。
    if (!canProcessReminder(task, now)) {
      return null;
    }

    const lockUntil = new Date(now.getTime() + lockMs);
    const updatedAttempts = attempts + 1;

    await taskRef.update({
      data: {
        reminderStatus: REMINDER_STATUS.PROCESSING,
        reminderLockUntil: lockUntil.toISOString(),
        reminderAttempts: updatedAttempts,
        reminderUpdatedAt: now.toISOString()
      }
    });

    return {
      ...task,
      reminderStatus: REMINDER_STATUS.PROCESSING,
      reminderLockUntil: lockUntil.toISOString(),
      reminderAttempts: updatedAttempts,
      reminderUpdatedAt: now.toISOString()
    };
  });
}

module.exports = {
  DEFAULT_LOCK_MS,
  MAX_REMINDER_ATTEMPTS,
  RETRY_DELAY_MS,
  claimReminderTask
};