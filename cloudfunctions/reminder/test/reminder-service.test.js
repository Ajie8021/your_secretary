
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  processDueReminders
} = require('../reminder-service');

// 固定时间，保证测试不受执行时刻影响。
const now = new Date('2026-10-18T10:00:00.000Z');

// 创建默认符合提醒条件的任务，可通过 overrides 覆盖字段。
function createTask(overrides = {}) {
  return {
    _id: 'task-001',
    name: '测试任务',
    remindAt: '2026-10-18T09:00:00.000Z',
    completed: false,
    reminded: false,
    ...overrides
  };
}

test('只处理已经到期且符合提醒条件的任务', async () => {
  const tasks = [
    createTask({ _id: 'due' }),
    createTask({
      _id: 'future',
      remindAt: '2026-10-18T11:00:00.000Z'
    }),
    createTask({
      _id: 'completed',
      completed: true
    })
  ];

  const sentIds = [];
  const markedIds = [];

  const result = await processDueReminders({
    tasks,
    now,
    sendReminder: async task => {
      // 记录实际进入发送流程的任务。
      sentIds.push(task._id);
    },
    markReminded: async task => {
      // 记录实际执行状态更新的任务。
      markedIds.push(task._id);
    }
  });

  assert.deepEqual(sentIds, ['due']);
  assert.deepEqual(markedIds, ['due']);
  assert.equal(result.dueCount, 1);
  assert.equal(result.successCount, 1);
  assert.equal(result.failureCount, 0);
});

test('单次处理数量不能超过 limit', async () => {
  const tasks = Array.from({ length: 5 }, (_, index) =>
    createTask({
      _id: `task-${index}`,
      remindAt: '2026-10-18T09:00:00.000Z'
    })
  );

  let sendCount = 0;

  const result = await processDueReminders({
    tasks,
    now,
    limit: 2,
    sendReminder: async () => {
      sendCount++;
    },
    markReminded: async () => {}
  });

  assert.equal(sendCount, 2);
  assert.equal(result.dueCount, 5);
  assert.equal(result.processedCount, 2);
  assert.equal(result.successCount, 2);
});

test('发送失败时不应标记任务为已提醒', async () => {
  const task = createTask();
  let marked = false;

  const result = await processDueReminders({
    tasks: [task],
    now,
    sendReminder: async () => {
      // 模拟消息发送失败。
      throw new Error('模拟发送失败');
    },
    markReminded: async () => {
      marked = true;
    }
  });

  assert.equal(marked, false);
  assert.equal(result.successCount, 0);
  assert.equal(result.failureCount, 1);
  assert.equal(result.failures[0].taskId, task._id);
});

test('状态更新失败时应记录失败，不能统计为完全成功', async () => {
  const task = createTask();
  let sendCount = 0;

  const result = await processDueReminders({
    tasks: [task],
    now,
    sendReminder: async () => {
      // 消息已发送，但模拟数据库更新失败。
      sendCount++;
    },
    markReminded: async () => {
      throw new Error('模拟数据库更新失败');
    }
  });

  assert.equal(sendCount, 1);
  assert.equal(result.successCount, 0);
  assert.equal(result.failureCount, 1);
  assert.equal(result.failures[0].message, '模拟数据库更新失败');
});

test('一个任务失败不应阻断后续任务', async () => {
  const tasks = [
    createTask({ _id: 'failed' }),
    createTask({ _id: 'success' })
  ];

  const sentIds = [];

  const result = await processDueReminders({
    tasks,
    now,
    sendReminder: async task => {
      sentIds.push(task._id);

      if (task._id === 'failed') {
        throw new Error('模拟单任务失败');
      }
    },
    markReminded: async () => {}
  });

  assert.deepEqual(sentIds, ['failed', 'success']);
  assert.equal(result.successCount, 1);
  assert.equal(result.failureCount, 1);
});

test('没有到期任务时不调用发送和状态更新函数', async () => {
  const tasks = [
    createTask({
      _id: 'future',
      remindAt: '2026-10-18T11:00:00.000Z'
    })
  ];

  let callCount = 0;

  const result = await processDueReminders({
    tasks,
    now,
    sendReminder: async () => {
      callCount++;
    },
    markReminded: async () => {
      callCount++;
    }
  });

  assert.equal(callCount, 0);
  assert.equal(result.dueCount, 0);
  assert.equal(result.processedCount, 0);
});

test('非法参数应明确报错', async () => {
  // 测试候选列表类型校验。
  await assert.rejects(
    processDueReminders({
      tasks: null,
      now,
      sendReminder: async () => {},
      markReminded: async () => {}
    }),
    /tasks 必须是数组/
  );

  // 测试批次大小校验。
  await assert.rejects(
    processDueReminders({
      tasks: [],
      now,
      limit: 0,
      sendReminder: async () => {},
      markReminded: async () => {}
    }),
    /limit 必须是大于 0 的整数/
  );
});
