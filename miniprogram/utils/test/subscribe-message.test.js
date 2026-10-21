const test = require('node:test');
const assert = require('node:assert/strict');

const {
  REMINDER_TEMPLATE_ID,
  requestTaskReminderSubscription
} = require('../subscribe-message');

test('应使用正确的模板 ID 申请订阅授权', async () => {
  let receivedOptions;

  const mockApi = options => {
    receivedOptions = options;

    // 模拟用户同意订阅。
    options.success({
      [REMINDER_TEMPLATE_ID]: 'accept'
    });
  };

  const result = await requestTaskReminderSubscription({
    requestSubscribeMessage: mockApi
  });

  assert.deepEqual(receivedOptions.tmplIds, [
    REMINDER_TEMPLATE_ID
  ]);
  assert.equal(result.status, 'accepted');
});

test('用户拒绝授权时应返回 rejected', async () => {
  const mockApi = options => {
    options.success({
      [REMINDER_TEMPLATE_ID]: 'reject'
    });
  };

  const result = await requestTaskReminderSubscription({
    requestSubscribeMessage: mockApi
  });

  assert.equal(result.status, 'rejected');
});

test('授权 API 调用失败时应返回 error', async () => {
  const mockApi = options => {
    options.fail({
      errMsg: 'requestSubscribeMessage:fail'
    });
  };

  const result = await requestTaskReminderSubscription({
    requestSubscribeMessage: mockApi
  });

  assert.equal(result.status, 'error');
  assert.match(result.message, /requestSubscribeMessage/);
});

test('不支持授权 API 时应返回 unavailable', async () => {
  const result = await requestTaskReminderSubscription({});

  assert.equal(result.status, 'unavailable');
});

test('授权 API 同步抛出异常时应返回 error', async () => {
  const mockApi = () => {
    throw new Error('模拟接口异常');
  };

  const result = await requestTaskReminderSubscription({
    requestSubscribeMessage: mockApi
  });

  assert.equal(result.status, 'error');
  assert.match(result.message, /模拟接口异常/);
});