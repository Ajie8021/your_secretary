const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildSubscribeMessagePayload,
  sendSubscriptionMessage
} = require('../subscription-message');

const {
  TEMPLATE_FIELD_MAP
} = require('../reminder-config');

// 使用模拟任务和模拟模板字段，不依赖真实微信模板。
const task = {
  _id: 'task-001',
  name: '提交课程作业',
  remindAt: '2026-10-21 09:00',
  content: '完成并上传作业'
};

const fieldMap = {
  thing1: item => item.name,
  time2: item => item.remindAt
};

test('应正确构建订阅消息发送参数', () => {
  const payload = buildSubscribeMessagePayload({
    openid: 'test-openid',
    templateId: 'test-template-id',
    task,
    fieldMap,
    page: 'pages/tasks/index'
  });

  assert.equal(payload.touser, 'test-openid');
  assert.equal(payload.templateId, 'test-template-id');
  assert.equal(payload.page, 'pages/tasks/index');

  // 验证任务字段已转换为微信模板的数据结构。
  assert.deepEqual(payload.data, {
    thing1: { value: '提交课程作业' },
    time2: { value: '2026-10-21 09:00' }
  });
});

test('缺少 OPENID 时应拒绝构建参数', () => {
  assert.throws(
    () => buildSubscribeMessagePayload({
      openid: '',
      templateId: 'test-template-id',
      task,
      fieldMap
    }),
    /OPENID/
  );
});

test('缺少模板 ID 时应拒绝构建参数', () => {
  assert.throws(
    () => buildSubscribeMessagePayload({
      openid: 'test-openid',
      templateId: '',
      task,
      fieldMap
    }),
    /模板 ID/
  );
});

test('没有配置模板字段时应拒绝构建参数', () => {
  assert.throws(
    () => buildSubscribeMessagePayload({
      openid: 'test-openid',
      templateId: 'test-template-id',
      task,
      fieldMap: {}
    }),
    /模板字段/
  );
});

test('模板字段内容为空时应拒绝发送', () => {
  assert.throws(
    () => buildSubscribeMessagePayload({
      openid: 'test-openid',
      templateId: 'test-template-id',
      task: { name: '' },
      fieldMap: {
        thing1: item => item.name
      }
    }),
    /内容不能为空/
  );
});

test('应调用发送接口并传入正确参数', async () => {
  let receivedPayload = null;

  // 模拟微信发送 API，记录调用参数。
  const mockSendApi = async payload => {
    receivedPayload = payload;
    return { errCode: 0 };
  };

  const result = await sendSubscriptionMessage({
    sendApi: mockSendApi,
    openid: 'test-openid',
    templateId: 'test-template-id',
    task,
    fieldMap
  });

  assert.deepEqual(result, { errCode: 0 });
  assert.equal(receivedPayload.touser, 'test-openid');
});

test('微信接口发送失败时应标记 send 阶段', async () => {
  const mockSendApi = async () => {
    throw new Error('模拟发送失败');
  };

  await assert.rejects(
    sendSubscriptionMessage({
      sendApi: mockSendApi,
      openid: 'test-openid',
      templateId: 'test-template-id',
      task,
      fieldMap
    }),
    error => {
      // 验证错误信息和阶段，便于上层统计发送失败。
      assert.match(error.message, /模拟发送失败/);
      assert.equal(error.stage, 'send');
      return true;
    }
  );

  test('任务描述超长时应截断到最大长度', () => {
    const result = TEMPLATE_FIELD_MAP.thing4({
      content: '这是一段超过限制长度的任务描述内容'
    });
  
    // 确认输出长度不超过模板字段上限。
    assert.ok(result.length <= 20);
  });
  
  test('任务描述未超长时应保持原样', () => {
    const content = '明天提交报告';
  
    const result = TEMPLATE_FIELD_MAP.thing4({ content });
  
    assert.equal(result, content);
  });
  
  test('任务描述为空时应使用默认文本', () => {
    const result = TEMPLATE_FIELD_MAP.thing4({ content: '' });
  
    assert.equal(result, '暂无任务描述');
  });
});