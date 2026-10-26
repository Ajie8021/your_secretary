
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  processDueReminders
} = require('../reminder-service');

// 固定测试时间，避免测试结果受到系统时间影响。
const NOW = new Date('2026-10-26T02:00:00.000Z');

// 创建一条已经到提醒时间、尚未发送的测试任务。
function createTask() {
  return {
    _id: 'task-001',
    remindAt: '2026-10-26T01:00:00.000Z',
    reminded: false,
    completed: false,
    reminderAttempts: 1
  };
}

test('领取成功且发送成功时，应标记任务已提醒', async () => {
  const calls = [];

  const result = await processDueReminders({
    tasks: [createTask()],
    now: NOW,
    claimReminder: async task => ({
      ...task,
      reminderStatus: 'processing'
    }),
    sendReminder: async task => {
      calls.push(`send:${task._id}`);
    },
    markReminded: async task => {
      calls.push(`sent:${task._id}`);
    },
    markFailed: async () => {
      calls.push('failed');
    }
  });

  assert.equal(result.successCount, 1);
  assert.equal(result.failureCount, 0);
  assert.deepEqual(calls, [
    'send:task-001',
    'sent:task-001'
  ]);
});

test('领取失败或任务已被其他实例领取时，不应发送消息', async () => {
  let sendCount = 0;

  const result = await processDueReminders({
    tasks: [createTask()],
    now: NOW,
    claimReminder: async () => null,
    sendReminder: async () => {
      sendCount++;
    },
    markReminded: async () => {},
    markFailed: async () => {}
  });

  assert.equal(result.skippedCount, 1);
  assert.equal(result.successCount, 0);
  assert.equal(sendCount, 0);
});

test('发送失败时，应记录失败并继续处理其他任务', async () => {
  const failedIds = [];
  let sendCount = 0;

  const result = await processDueReminders({
    tasks: [
      createTask(),
      { ...createTask(), _id: 'task-002' }
    ],
    now: NOW,
    claimReminder: async task => task,
    sendReminder: async task => {
      sendCount++;

      if (task._id === 'task-001') {
        const error = new Error('模拟微信接口发送失败');
        error.stage = 'send';
        throw error;
      }
    },
    markReminded: async () => {},
    markFailed: async task => {
      failedIds.push(task._id);
    }
  });

  assert.equal(sendCount, 2);
  assert.equal(result.failureCount, 1);
  assert.equal(result.successCount, 1);
  assert.deepEqual(failedIds, ['task-001']);
});

test('发送成功但更新数据库失败时，不应立即记录为发送失败', async () => {
  let failedCount = 0;

  const result = await processDueReminders({
    tasks: [createTask()],
    now: NOW,
    claimReminder: async task => task,
    sendReminder: async () => {},
    markReminded: async () => {
      throw new Error('模拟数据库更新失败');
    },
    markFailed: async () => {
      failedCount++;
    }
  });

  assert.equal(result.successCount, 0);
  assert.equal(result.failureCount, 1);
  assert.equal(result.failures[0].stage, 'mark-sent');

  // 消息接口已经返回成功，不应直接安排发送重试。
  assert.equal(failedCount, 0);
});
