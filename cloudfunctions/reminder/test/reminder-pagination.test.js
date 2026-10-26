
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  collectDueTaskPages
} = require('../reminder-pagination');

const NOW = new Date('2026-10-26T02:00:00.000Z');

// 构造指定数量的任务，便于模拟数据库分页。
function createTasks(start, count) {
  return Array.from({ length: count }, (_, index) => ({
    _id: `task-${start + index}`
  }));
}

test('应按页收集任务，并在最后一页提前结束', async () => {
  const calls = [];

  const result = await collectDueTaskPages({
    now: NOW,
    batchSize: 3,
    maxBatches: 5,
    queryPage: async (offset, limit) => {
      calls.push({ offset, limit });

      if (offset === 0) return createTasks(1, 3);
      if (offset === 3) return createTasks(4, 2);

      return [];
    }
  });

  assert.equal(result.length, 5);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1], { offset: 3, limit: 3 });
});

test('应遵守最大批次数限制', async () => {
  let callCount = 0;

  const result = await collectDueTaskPages({
    now: NOW,
    batchSize: 2,
    maxBatches: 3,
    queryPage: async offset => {
      callCount++;
      return createTasks(offset + 1, 2);
    }
  });

  assert.equal(callCount, 3);
  assert.equal(result.length, 6);
});

test('应避免同一任务重复加入结果', async () => {
  const result = await collectDueTaskPages({
    now: NOW,
    batchSize: 2,
    maxBatches: 2,
    queryPage: async offset => {
      if (offset === 0) {
        return [
          { _id: 'task-001' },
          { _id: 'task-002' }
        ];
      }

      return [
        { _id: 'task-002' },
        { _id: 'task-003' }
      ];
    }
  });

  assert.deepEqual(
    result.map(task => task._id),
    ['task-001', 'task-002', 'task-003']
  );
});

test('查询函数返回非数组时应抛出错误', async () => {
  await assert.rejects(
    collectDueTaskPages({
      now: NOW,
      queryPage: async () => null
    }),
    /queryPage 必须返回数组/
  );
});

test('数据库查询失败时应向上抛出异常', async () => {
  await assert.rejects(
    collectDueTaskPages({
      now: NOW,
      queryPage: async () => {
        throw new Error('模拟数据库连接失败');
      }
    }),
    /模拟数据库连接失败/
  );
});
