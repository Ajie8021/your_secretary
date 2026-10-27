
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  isReminderProcessingLocked,
  buildReminderResetChanges
} = require('../task-rules');

test('有效处理锁尚未过期时应禁止修改提醒配置', () => {
  const now = new Date('2026-10-27T10:00:00.000Z');

  const task = {
    reminderStatus: 'processing',
    reminderLockUntil: '2026-10-27T10:01:00.000Z'
  };

  assert.equal(isReminderProcessingLocked(task, now), true);
});

test('处理锁已过期时应允许恢复提醒配置', () => {
  const now = new Date('2026-10-27T10:02:00.000Z');

  const task = {
    reminderStatus: 'processing',
    reminderLockUntil: '2026-10-27T10:01:00.000Z'
  };

  assert.equal(isReminderProcessingLocked(task, now), false);
});

test('非 processing 状态不应被视为仍持有处理锁', () => {
  const now = new Date('2026-10-27T10:00:00.000Z');

  const task = {
    reminderStatus: 'sent',
    reminderLockUntil: '2026-10-27T10:01:00.000Z'
  };

  assert.equal(isReminderProcessingLocked(task, now), false);
});

test('重置提醒状态时应清理旧锁、重试信息并恢复待处理状态', () => {
  const now = new Date('2026-10-27T10:00:00.000Z');

  const result = buildReminderResetChanges(now);

  assert.deepEqual(result, {
    reminded: false,
    reminderStatus: 'pending',
    reminderLockUntil: null,
    reminderAttempts: 0,
    reminderNextRetryAt: null,
    reminderUpdatedAt: '2026-10-27T10:00:00.000Z'
  });
});

test('无效时间不应生成提醒状态重置结果', () => {
  assert.throws(
    () => buildReminderResetChanges(new Date('invalid')),
    {
      name: 'TypeError',
      message: 'now 必须是有效的 Date 对象'
    }
  );
});
