
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isReminderEligible,
  isReminderDue
} = require('../reminder-rules');

// 固定当前时间，避免测试依赖运行时的真实时间。
const now = new Date('2026-10-18T10:00:00.000Z');

// 创建基础任务，其他测试可以只修改自己关心的字段。
function createTask(overrides = {}) {
  return {
    _id: 'test-task-001',
    name: '测试任务',
    remindAt: '2026-10-18T09:00:00.000Z',
    completed: false,
    reminded: false,
    ...overrides
  };
}

test('有效且未完成、未提醒的任务符合提醒资格', () => {
  const task = createTask();

  assert.equal(isReminderEligible(task), true);
});

test('已完成的任务不符合提醒资格', () => {
  const task = createTask({
    completed: true
  });

  assert.equal(isReminderEligible(task), false);
});

test('已经提醒过的任务不符合提醒资格', () => {
  const task = createTask({
    reminded: true
  });

  assert.equal(isReminderEligible(task), false);
});

test('没有提醒时间的任务不符合提醒资格', () => {
  const task = createTask({
    remindAt: null
  });

  assert.equal(isReminderEligible(task), false);
});

test('无效提醒时间不符合提醒资格', () => {
  const task = createTask({
    remindAt: 'not-a-valid-date'
  });

  assert.equal(isReminderEligible(task), false);
});

test('提醒时间早于当前时间时应该进入提醒处理', () => {
  const task = createTask({
    remindAt: '2026-10-18T09:00:00.000Z'
  });

  assert.equal(isReminderDue(task, now), true);
});

test('提醒时间等于当前时间时应该进入提醒处理', () => {
  const task = createTask({
    remindAt: '2026-10-18T10:00:00.000Z'
  });

  assert.equal(isReminderDue(task, now), true);
});

test('提醒时间晚于当前时间时不应进入提醒处理', () => {
  const task = createTask({
    remindAt: '2026-10-18T11:00:00.000Z'
  });

  assert.equal(isReminderDue(task, now), false);
});

test('已完成任务即使提醒时间已到也不应提醒', () => {
  const task = createTask({
    completed: true,
    remindAt: '2026-10-18T09:00:00.000Z'
  });

  assert.equal(isReminderDue(task, now), false);
});

test('无效的当前时间不应触发提醒', () => {
  const task = createTask();

  assert.equal(isReminderDue(task, 'invalid-current-time'), false);
});

test('空任务不符合提醒资格，也不应触发提醒', () => {
  assert.equal(isReminderEligible(null), false);
  assert.equal(isReminderDue(null, now), false);
});
