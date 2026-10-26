
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  claimReminderTask,
  DEFAULT_LOCK_MS
} = require('../reminder-store');

const NOW = new Date('2026-10-26T02:00:00.000Z');

/**
 * 创建一个简化的事务数据库模拟对象。
 * 测试只关注任务读取和更新，不连接真实云数据库。
 */
function createMockDb(initialTask) {
  const state = {
    task: initialTask ? { ...initialTask } : null,
    updates: []
  };

  const db = {
    async runTransaction(callback) {
      // 模拟事务回调；不模拟真实数据库的并发冲突。
      const transaction = {
        collection(name) {
          assert.equal(name, 'tasks');

          return {
            doc(taskId) {
              assert.equal(taskId, 'task-001');

              return {
                async get() {
                  return {
                    data: state.task ? { ...state.task } : null
                  };
                },

                async update({ data }) {
                  state.updates.push(data);
                  state.task = {
                    ...state.task,
                    ...data
                  };
                  return { stats: { updated: 1 } };
                }
              };
            }
          };
        }
      };

      return callback(transaction);
    }
  };

  return { db, state };
}

function createTask(overrides = {}) {
  return {
    _id: 'task-001',
    remindAt: '2026-10-26T01:00:00.000Z',
    reminded: false,
    completed: false,
    reminderAttempts: 0,
    ...overrides
  };
}

test('应成功领取已到提醒时间的任务', async () => {
  const { db, state } = createMockDb(createTask());

  const result = await claimReminderTask(db, 'task-001', NOW);

  assert.equal(result.reminderStatus, 'processing');
  assert.equal(result.reminderAttempts, 1);
  assert.equal(state.updates.length, 1);

  // 锁的有效期应为默认的两分钟。
  assert.equal(
    new Date(result.reminderLockUntil).getTime(),
    NOW.getTime() + DEFAULT_LOCK_MS
  );
});

test('不能提前领取尚未到提醒时间的任务', async () => {
  const { db, state } = createMockDb(
    createTask({ remindAt: '2026-10-26T03:00:00.000Z' })
  );

  const result = await claimReminderTask(db, 'task-001', NOW);

  assert.equal(result, null);
  assert.equal(state.updates.length, 0);
});

test('已发送的任务不能再次领取', async () => {
  const { db, state } = createMockDb(
    createTask({ reminded: true, reminderStatus: 'sent' })
  );

  const result = await claimReminderTask(db, 'task-001', NOW);

  assert.equal(result, null);
  assert.equal(state.updates.length, 0);
});

test('仍处于有效锁定期的任务不能再次领取', async () => {
  const { db, state } = createMockDb(
    createTask({
      reminderStatus: 'processing',
      reminderLockUntil: '2026-10-26T02:01:00.000Z'
    })
  );

  const result = await claimReminderTask(db, 'task-001', NOW);

  assert.equal(result, null);
  assert.equal(state.updates.length, 0);
});

test('锁已过期的任务可以重新领取', async () => {
  const { db, state } = createMockDb(
    createTask({
      reminderStatus: 'processing',
      reminderLockUntil: '2026-10-26T01:59:00.000Z',
      reminderAttempts: 1
    })
  );

  const result = await claimReminderTask(db, 'task-001', NOW);

  assert.equal(result.reminderStatus, 'processing');
  assert.equal(result.reminderAttempts, 2);
  assert.equal(state.updates.length, 1);
});

test('缺少状态字段的旧任务仍可领取', async () => {
  const { db, state } = createMockDb(
    createTask({
      reminderStatus: undefined,
      reminderLockUntil: undefined
    })
  );

  const result = await claimReminderTask(db, 'task-001', NOW);

  assert.equal(result.reminderStatus, 'processing');
  assert.equal(state.updates.length, 1);
});

test('任务不存在时不应更新数据库', async () => {
  const { db, state } = createMockDb(null);

  const result = await claimReminderTask(db, 'task-001', NOW);

  assert.equal(result, null);
  assert.equal(state.updates.length, 0);
});

test('无效的任务 ID 应抛出参数错误', async () => {
  const { db } = createMockDb(createTask());

  await assert.rejects(
    claimReminderTask(db, '', NOW),
    /taskId 必须是非空字符串/
  );
});
