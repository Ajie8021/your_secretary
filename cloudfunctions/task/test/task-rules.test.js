const test = require('node:test');
const assert = require('node:assert/strict');

const {
  hasReminderConfigChanged,
  isReminderEligible
} = require('../task-rules');

test('只修改任务描述时，不需要重置提醒状态', () => {
  const currentTask = {
    ddl: new Date('2026-10-20T10:00:00.000Z'),
    remindAt: new Date('2026-10-20T09:00:00.000Z')
  };

  // 只提交 content，没有提交任何提醒配置字段。
  const changes = {
    content: '修改后的任务描述'
  };

  assert.equal(
    hasReminderConfigChanged(currentTask, changes),
    false
  );
});

test('截止时间发生变化时，需要重置提醒状态', () => {
  const currentTask = {
    ddl: new Date('2026-10-20T10:00:00.000Z'),
    remindAt: null
  };

  const changes = {
    ddl: new Date('2026-10-21T10:00:00.000Z')
  };

  assert.equal(
    hasReminderConfigChanged(currentTask, changes),
    true
  );
});

test('相同时间的不同日期表示不应被判定为变化', () => {
  const currentTask = {
    remindAt: new Date('2026-10-20T09:00:00.000Z')
  };

  // ISO 字符串与 Date 对象表示同一个时刻。
  const changes = {
    remindAt: '2026-10-20T09:00:00.000Z'
  };

  assert.equal(
    hasReminderConfigChanged(currentTask, changes),
    false
  );
});

test('未设置的提醒时间改为有效时间时，应判定为变化', () => {
  const currentTask = {
    remindAt: null
  };

  const changes = {
    remindAt: new Date('2026-10-20T09:00:00.000Z')
  };

  assert.equal(
    hasReminderConfigChanged(currentTask, changes),
    true
  );
});

test('未完成、未提醒且设置了提醒时间的任务符合基本条件', () => {
  const task = {
    completed: false,
    reminded: false,
    remindAt: new Date('2026-10-20T09:00:00.000Z')
  };

  assert.equal(isReminderEligible(task), true);
});

test('已完成的任务不符合提醒条件', () => {
  const task = {
    completed: true,
    reminded: false,
    remindAt: new Date('2026-10-20T09:00:00.000Z')
  };

  assert.equal(isReminderEligible(task), false);
});

test('已发送提醒或未设置提醒时间的任务不符合提醒条件', () => {
  assert.equal(
    isReminderEligible({
      completed: false,
      reminded: true,
      remindAt: new Date('2026-10-20T09:00:00.000Z')
    }),
    false
  );

  assert.equal(
    isReminderEligible({
      completed: false,
      reminded: false,
      remindAt: null
    }),
    false
  );
});