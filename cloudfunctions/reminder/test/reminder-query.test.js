
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildDueTaskQuery
} = require('../reminder-query');

test('查询条件应筛选未提醒且提醒时间不晚于当前时间的任务', () => {
  const now = new Date('2026-10-21T10:00:00.000Z');

  // 使用模拟的 lte，避免单元测试依赖微信云开发 SDK。
  const fakeCommand = {
    lte: value => ({ $lte: value })
  };

  const query = buildDueTaskQuery(fakeCommand, now);

  assert.deepEqual(query, {
    reminded: false,
    remindAt: { $lte: now }
  });
});

test('缺少数据库 command 对象时应报错', () => {
  // 验证错误配置会被尽早发现，而不是在数据库查询时才失败。
  assert.throws(
    () => buildDueTaskQuery(null, new Date()),
    /dbCommand 必须提供 lte 方法/
  );
});

test('当前时间无效时应报错', () => {
  // 无效时间可能导致查询范围错误，因此必须拒绝。
  assert.throws(
    () => buildDueTaskQuery(
      { lte: value => value },
      new Date('invalid')
    ),
    /now 必须是有效的 Date 对象/
  );
});
