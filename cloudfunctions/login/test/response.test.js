const test = require('node:test');
const assert = require('node:assert/strict');

const { success, failure } = require('../response');

test('success 应返回统一的成功响应结构', () => {
  const data = { nickname: '测试用户' };

  const result = success(data);

  assert.equal(result.code, 0);
  assert.equal(result.message, 'ok');
  assert.deepEqual(result.data, data);
});

test('success 应支持自定义提示信息', () => {
  const result = success({ id: 'user-1' }, '初始化成功');

  assert.equal(result.code, 0);
  assert.equal(result.message, '初始化成功');
});

test('failure 应返回指定错误码和提示', () => {
  const result = failure(401, '无法识别当前用户');

  assert.equal(result.code, 401);
  assert.equal(result.message, '无法识别当前用户');
  assert.equal(result.data, null);
});