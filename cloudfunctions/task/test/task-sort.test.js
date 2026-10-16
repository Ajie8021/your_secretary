
const test = require('node:test');
const assert = require('node:assert/strict');

const { sortTasks, compareTasks } = require('../task-sort');

// 构造统一的测试任务，允许单独覆盖需要验证的字段。
function makeTask(id, overrides = {}) {
  return {
    _id: id,
    top: false,
    level: 1,
    ddl: new Date('2026-10-30T12:00:00.000Z'),
    createTime: new Date('2026-10-01T12:00:00.000Z'),
    ...overrides
  };
}

test('优先显示置顶任务，即使其等级较低', () => {
  const tasks = [
    makeTask('high-level', { level: 4 }),
    makeTask('pinned', { top: true, level: 1 }),
    makeTask('normal', { level: 2 })
  ];

  const result = sortTasks(tasks);

  assert.deepEqual(
    result.map(task => task._id),
    ['pinned', 'high-level', 'normal']
  );
});

test('非置顶任务按等级降序排列', () => {
  const tasks = [
    makeTask('level-2', { level: 2 }),
    makeTask('level-1', { level: 1 }),
    makeTask('level-4', { level: 4 }),
    makeTask('level-3', { level: 3 })
  ];

  const result = sortTasks(tasks);

  assert.deepEqual(
    result.map(task => task._id),
    ['level-4', 'level-3', 'level-2', 'level-1']
  );
});

test('等级相同时，截止时间较早的任务优先', () => {
  const tasks = [
    makeTask('late', {
      level: 3,
      ddl: '2026-10-25T12:00:00.000Z'
    }),
    makeTask('early', {
      level: 3,
      ddl: '2026-10-20T12:00:00.000Z'
    })
  ];

  const result = sortTasks(tasks);

  assert.deepEqual(
    result.map(task => task._id),
    ['early', 'late']
  );
});

test('等级和截止时间相同时，创建时间较新的任务优先', () => {
  const tasks = [
    makeTask('old', {
      level: 3,
      ddl: '2026-10-20T12:00:00.000Z',
      createTime: '2026-10-01T12:00:00.000Z'
    }),
    makeTask('new', {
      level: 3,
      ddl: '2026-10-20T12:00:00.000Z',
      createTime: '2026-10-05T12:00:00.000Z'
    })
  ];

  const result = sortTasks(tasks);

  assert.deepEqual(
    result.map(task => task._id),
    ['new', 'old']
  );
});

test('综合验证四级排序规则', () => {
  const tasks = [
    makeTask('normal-level-4-late', {
      level: 4,
      ddl: '2026-10-25T12:00:00.000Z'
    }),
    makeTask('pinned-level-1', {
      top: true,
      level: 1
    }),
    makeTask('normal-level-4-early', {
      level: 4,
      ddl: '2026-10-20T12:00:00.000Z'
    }),
    makeTask('normal-level-3', {
      level: 3
    }),
    makeTask('pinned-level-4', {
      top: true,
      level: 4
    })
  ];

  const result = sortTasks(tasks);

  assert.deepEqual(
    result.map(task => task._id),
    [
      'pinned-level-4',
      'pinned-level-1',
      'normal-level-4-early',
      'normal-level-4-late',
      'normal-level-3'
    ]
  );
});

test('没有截止时间的任务排在有截止时间的任务后面', () => {
  const tasks = [
    makeTask('no-ddl', { ddl: null }),
    makeTask('has-ddl', { ddl: '2026-10-20T12:00:00.000Z' })
  ];

  const result = sortTasks(tasks);

  assert.deepEqual(
    result.map(task => task._id),
    ['has-ddl', 'no-ddl']
  );
});

test('排序不会修改原数组', () => {
  const tasks = [
    makeTask('level-1', { level: 1 }),
    makeTask('level-4', { level: 4 })
  ];

  const originalIds = tasks.map(task => task._id);
  const result = sortTasks(tasks);

  assert.deepEqual(
    tasks.map(task => task._id),
    originalIds
  );

  assert.notStrictEqual(result, tasks);
  assert.deepEqual(
    result.map(task => task._id),
    ['level-4', 'level-1']
  );
});

test('排序字段相同时比较结果为 0', () => {
  const a = makeTask('a');
  const b = makeTask('b');

  assert.equal(compareTasks(a, b), 0);
});
