/**
 * 任务模块的纯业务规则。
 *
 * 本文件不访问云数据库，也不依赖微信云开发环境，
 * 因此可以直接使用 Node.js 运行单元测试。
 */

/**
 * 判断提醒配置是否发生变化。
 *
 * 只有截止时间或提醒时间真正发生变化时，
 * 才需要重置 reminded，避免修改描述时重复安排提醒。
 */
function hasReminderConfigChanged(currentTask, changes) {
  const fields = ['ddl', 'remindAt'];

  return fields.some(field => {
    // 未提交的字段不参与比较。
    if (!Object.prototype.hasOwnProperty.call(changes, field)) {
      return false;
    }

    const oldValue = normalizeDate(currentTask[field]);
    const newValue = normalizeDate(changes[field]);

    return oldValue !== newValue;
  });
}

/**
 * 将日期统一转换为时间戳，便于比较。
 * null、undefined 和空字符串统一表示“未设置”。
 */
function normalizeDate(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.getTime();
}

/**
 * 判断任务是否可以进入待发送提醒的处理流程。
 *
 * 具体的提醒时间到达判断、订阅消息发送和发送结果记录，
 * 由后续提醒云函数负责。
 */
function isReminderEligible(task) {
  return Boolean(
    task &&
    !task.completed &&
    !task.reminded &&
    task.remindAt
  );
}

/**
 * 判断提醒是否仍处于有效的处理锁期内。
 *
 * 无效或缺失的锁时间不视为有效锁，
 * 由调用方决定如何恢复异常状态。
 *
 * @param {Object} task 当前任务
 * @param {Date} now 当前时间
 * @returns {boolean} 是否仍处于有效锁期内
 */
function isReminderProcessingLocked(task, now = new Date()) {
  if (
    !task ||
    task.reminderStatus !== 'processing' ||
    !task.reminderLockUntil
  ) {
    return false;
  }

  const lockUntil = new Date(task.reminderLockUntil);

  return (
    !Number.isNaN(lockUntil.getTime()) &&
    lockUntil.getTime() > now.getTime()
  );
}

/**
 * 构造提醒配置变更后的状态重置字段。
 *
 * @param {Date} now 当前时间
 * @returns {Object} 需要写入数据库的提醒状态字段
 */
function buildReminderResetChanges(now = new Date()) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TypeError('now 必须是有效的 Date 对象');
  }

  return {
    reminded: false,
    reminderStatus: 'pending',
    reminderLockUntil: null,
    reminderAttempts: 0,
    reminderNextRetryAt: null,
    reminderUpdatedAt: now.toISOString()
  };
}

module.exports = {
  hasReminderConfigChanged,
  isReminderEligible,
  isReminderProcessingLocked,
  buildReminderResetChanges
};