
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validateCreateTask,
  parsePagination,
  validateUpdateTask
} = require('../validation');

test('未填写名称时使用默认名称', () => {
  const result = validateCreateTask({});

  assert.equal(result.valid, true);
  assert.equal(result.data.name, '无名');
  assert.equal(result.data.level, 1);
  assert.deepEqual(result.data.images, []);
});

test('合法任务参数可以通过校验', () => {
  const result = validateCreateTask({
    name: '完成课程作业',
    type: '学习',
    level: 4,
    ddl: '2026-10-20T12:00:00.000Z',
    content: '完成并提交作业',
    images: ['cloud://example/image.png']
  });

  assert.equal(result.valid, true);
  assert.equal(result.data.name, '完成课程作业');
  assert.equal(result.data.level, 4);
  assert.ok(result.data.ddl instanceof Date);
});

test('任务名称会去除首尾空格', () => {
  const result = validateCreateTask({
    name: '  复习考试  '
  });

  assert.equal(result.valid, true);
  assert.equal(result.data.name, '复习考试');
});

test('不合法的任务等级应被拒绝', () => {
  for (const level of [0, 5, -1, '4', 1.5]) {
    const result = validateCreateTask({ level });

    assert.equal(result.valid, false);
  }
});

test('不合法的截止时间应被拒绝', () => {
  const result = validateCreateTask({
    ddl: 'not-a-date'
  });

  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
});

test('图片列表格式错误应被拒绝', () => {
  const result = validateCreateTask({
    images: 'not-an-array'
  });

  assert.equal(result.valid, false);
});

test('不能将 null 或数组当作任务参数对象', () => {
  assert.equal(validateCreateTask(null).valid, false);
  assert.equal(validateCreateTask([]).valid, false);
});

/**
 * 分页参数校验测试
 */
test('分页参数使用默认值', () => {
  const result = parsePagination({});

  assert.equal(result.valid, true);
  assert.deepEqual(result.data, {
    page: 1,
    pageSize: 20,
    skip: 0
  });
});

test('分页参数正确计算跳过条数', () => {
  const result = parsePagination({
    page: 3,
    pageSize: 10
  });

  assert.equal(result.valid, true);
  assert.equal(result.data.skip, 20);
});

test('拒绝非法页码和每页条数', () => {
  for (const input of [
    { page: 0 },
    { page: -1 },
    { page: 1.5 },
    { pageSize: 0 },
    { pageSize: 101 },
    { pageSize: '20' }
  ]) {
    assert.equal(parsePagination(input).valid, false);
  }
});

/**
 * 任务修改、删除、置顶与完成状态。
 * 参数修改校验测试。
 */
test('修改任务时只返回用户提交的字段', () => {
  const result = validateUpdateTask({
    name: '  新任务名称  '
  });

  assert.equal(result.valid, true);

  // 名称应去除首尾空格。
  assert.equal(result.data.name, '新任务名称');

  // 未提交的字段不应被自动补齐，否则可能覆盖数据库原值。
  assert.equal(
    Object.prototype.hasOwnProperty.call(result.data, 'ddl'),
    false
  );
});

test('修改任务时允许同时更新多个合法字段', () => {
  const result = validateUpdateTask({
    name: '复习课程',
    level: 3,
    content: '复习第三章',
    images: []
  });

  assert.equal(result.valid, true);
  assert.equal(result.data.name, '复习课程');
  assert.equal(result.data.level, 3);
  assert.deepEqual(result.data.images, []);
});

test('拒绝不合法的任务等级', () => {
  // 等级必须为 1 到 4 的整数。
  for (const level of [0, 5, -1, 1.5, '3']) {
    const result = validateUpdateTask({ level });

    assert.equal(result.valid, false);
  }
});

test('拒绝无效的截止时间和提醒时间', () => {
  // 两种日期字段都必须是合法日期，空值则表示清除日期。
  assert.equal(
    validateUpdateTask({ ddl: 'invalid-date' }).valid,
    false
  );

  assert.equal(
    validateUpdateTask({ remindAt: 'invalid-date' }).valid,
    false
  );

  // 用户可以显式清除已有的截止时间或提醒时间。
  const result = validateUpdateTask({
    ddl: null,
    remindAt: null
  });

  assert.equal(result.valid, true);
  assert.equal(result.data.ddl, null);
  assert.equal(result.data.remindAt, null);
});

test('拒绝错误的图片列表和描述类型', () => {
  // 图片必须是字符串数组，描述必须是字符串。
  assert.equal(
    validateUpdateTask({ images: 'image.png' }).valid,
    false
  );

  assert.equal(
    validateUpdateTask({ content: 123 }).valid,
    false
  );
});

test('拒绝空对象和非法参数对象', () => {
  // 没有可修改字段时，不应执行无意义的更新。
  assert.equal(validateUpdateTask({}).valid, false);

  // null、数组等都不是合法的修改参数对象。
  assert.equal(validateUpdateTask(null).valid, false);
  assert.equal(validateUpdateTask([]).valid, false);
});

test('不能通过修改参数更改系统管理字段', () => {
  // _openid、top、completed 等字段不属于普通修改接口的白名单。
  const result = validateUpdateTask({
    _openid: 'fake-user',
    completed: true,
    top: true
  });

  assert.equal(result.valid, false);
});
