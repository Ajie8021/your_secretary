
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  REMINDER_STATUS,
  canProcessReminder
} = require('../reminder-state');

const now = new Date('2026-10-26T02:00:00.000Z');

test('未设置新状态的历史任务仍可进入处理流程', () => {
  // 兼容已经存在、尚未写入 reminderStatus 的旧记录。
  assert.equal(
    canProcessReminder({
      reminded: false,
      completed: false
    }, now),
    true
  );
});

test('已提醒任务不能再次处理', () => {
  assert.equal(
    canProcessReminder({
      reminded: true,
      reminderStatus: REMINDER_STATUS.SENT
    }, now),
    false
  );
});

test('已完成任务不能再次处理', () => {
  assert.equal(
    canProcessReminder({
      reminded: false,
      completed: true
    }, now),
    false
  );
});

test('锁未过期的 processing 任务不能重复处理', () => {
  assert.equal(
    canProcessReminder({
      reminded: false,
      reminderStatus: REMINDER_STATUS.PROCESSING,
      reminderLockUntil: '2026-10-26T02:05:00.000Z'
    }, now),
    false
  );
});

test('锁已过期的 processing 任务可以恢复处理', () => {
  assert.equal(
    canProcessReminder({
      reminded: false,
      reminderStatus: REMINDER_STATUS.PROCESSING,
      reminderLockUntil: '2026-10-26T01:55:00.000Z'
    }, now),
    true
  );
});

test('未知状态不能直接进入处理流程', () => {
  assert.equal(
    canProcessReminder({
      reminded: false,
      reminderStatus: 'unknown'
    }, now),
    false
  );
});

test('无效的当前时间应抛出异常', () => {
  assert.throws(
    () => canProcessReminder({}, new Date('invalid')),
    /now 必须是有效的 Date 对象/
  );
});
