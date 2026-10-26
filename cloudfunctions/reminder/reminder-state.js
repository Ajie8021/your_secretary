
/**
 * 提醒任务状态规则。
 *
 * 本模块只负责状态判断，不操作数据库，也不发送消息。
 */

const REMINDER_STATUS = Object.freeze({
  PENDING: 'pending',
  PROCESSING: 'processing',
  SENT: 'sent',
  FAILED: 'failed'
});

/**
 * 判断任务是否可以进入提醒处理流程。
 *
 * 兼容旧记录：
 * - reminded 为 true：禁止再次发送。
 * - completed 为 true：不发送提醒。
 * - 没有 reminderStatus：视为历史待处理记录。
 * - processing 且锁未过期：禁止并发处理。
 *
 * @param {Object} task 任务记录
 * @param {Date} now 当前时间
 * @returns {boolean} 是否可以尝试处理
 */
function canProcessReminder(task, now) {
  if (!task || typeof task !== 'object') {
    return false;
  }

  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TypeError('now 必须是有效的 Date 对象');
  }

  if (task.reminded === true || task.completed === true) {
    return false;
  }

  const status = task.reminderStatus;

  if (
    status !== undefined &&
    !Object.values(REMINDER_STATUS).includes(status)
  ) {
    return false;
  }

  if (status === REMINDER_STATUS.SENT) {
    return false;
  }

  if (status === REMINDER_STATUS.PROCESSING) {
    if (!task.reminderLockUntil) {
      // 没有锁截止时间的 processing 记录不应直接重复发送。
      return false;
    }

    const lockUntil = new Date(task.reminderLockUntil);

    if (Number.isNaN(lockUntil.getTime())) {
      return false;
    }

    // 锁尚未过期时，其他执行实例不能处理该任务。
    if (lockUntil.getTime() > now.getTime()) {
      return false;
    }

    // 锁过期后允许重新尝试，恢复意外中断的任务。
    return true;
  }

  return true;
}

module.exports = {
  REMINDER_STATUS,
  canProcessReminder
};
