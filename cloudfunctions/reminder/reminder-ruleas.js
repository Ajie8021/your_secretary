
/**
 * 判断任务是否符合提醒的基本条件。
 *
 * 规则：
 * 1. 任务必须存在；
 * 2. 任务不能已经完成；
 * 3. 任务不能已经提醒过；
 * 4. 必须设置有效的提醒时间。
 *
 * @param {Object} task 任务对象
 * @returns {boolean} 是否符合提醒资格
 */
function isReminderEligible(task) {
  if (!task || typeof task !== 'object') {
    return false;
  }

  // 已完成或已经提醒过的任务不再进入提醒流程。
  if (task.completed === true || task.reminded === true) {
    return false;
  }

  // 没有提醒时间，不需要发送提醒。
  if (
    task.remindAt === null ||
    task.remindAt === undefined ||
    task.remindAt === ''
  ) {
    return false;
  }

  // 支持数据库 Date 对象和 ISO 日期字符串。
  const remindTime = new Date(task.remindAt);

  // 无效日期不应进入提醒流程。
  return !Number.isNaN(remindTime.getTime());
}

/**
 * 判断任务的提醒时间是否已经到达。
 *
 * @param {Object} task 任务对象
 * @param {Date|string|number} now 当前时间，允许测试时传入固定时间
 * @returns {boolean} 是否应该进入本次提醒处理
 */
function isReminderDue(task, now = new Date()) {
  // 不符合基本提醒条件的任务不需要继续判断。
  if (!isReminderEligible(task)) {
    return false;
  }

  const remindTime = new Date(task.remindAt);
  const currentTime = new Date(now);

  // 当前时间无效时，保守地不触发提醒。
  if (Number.isNaN(currentTime.getTime())) {
    return false;
  }

  // 提醒时间等于当前时间时，也视为已经到期。
  return remindTime.getTime() <= currentTime.getTime();
}

module.exports = {
  isReminderEligible,
  isReminderDue
};
