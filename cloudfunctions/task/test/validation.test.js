
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validateCreateTask,
  parsePagination
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
