/**
 * 构建微信订阅消息的发送参数。
 *
 * fieldMap 示例：
 * {
 *   thing1: task => task.name,
 *   time2: task => task.remindAt
 * }
 *
 * 注意：thing1、time2 仅为示例。
 * 必须根据微信公众平台中实际模板的字段名称配置。
 */
function buildSubscribeMessagePayload({
  openid,
  templateId,
  task,
  fieldMap,
  page
}) {
  if (typeof openid !== 'string' || !openid.trim()) {
    throw new TypeError('接收用户的 OPENID 不能为空');
  }

  if (typeof templateId !== 'string' || !templateId.trim()) {
    throw new TypeError('订阅消息模板 ID 不能为空');
  }

  if (!task || typeof task !== 'object') {
    throw new TypeError('task 必须是有效的任务对象');
  }

  if (!fieldMap || typeof fieldMap !== 'object'
      || Object.keys(fieldMap).length === 0) {
    throw new TypeError('必须配置至少一个订阅消息模板字段');
  }

  const data = {};

  // 将任务数据转换为微信订阅消息要求的 { value: '...' } 格式。
  for (const [fieldName, getValue] of Object.entries(fieldMap)) {
    if (typeof getValue !== 'function') {
      throw new TypeError(`模板字段 ${fieldName} 的取值方法必须是函数`);
    }

    const value = getValue(task);

    if (value === undefined || value === null || value === '') {
      throw new TypeError(`模板字段 ${fieldName} 的内容不能为空`);
    }

    data[fieldName] = {
      value: String(value)
    };
  }

  const payload = {
    touser: openid,
    templateId,
    data
  };

  // page 是可选项，指定用户点击消息后打开的小程序页面。
  if (page) {
    payload.page = page;
  }

  return payload;
}

/**
 * 调用注入的发送接口。
 *
 * 通过参数注入 API，单元测试可以使用模拟函数，
 * 不需要真实调用微信服务器。
 */
async function sendSubscriptionMessage({
  sendApi,
  openid,
  templateId,
  task,
  fieldMap,
  page
}) {
  if (typeof sendApi !== 'function') {
    throw new TypeError('sendApi 必须是函数');
  }

  const payload = buildSubscribeMessagePayload({
    openid,
    templateId,
    task,
    fieldMap,
    page
  });

  try {
    return await sendApi(payload);
  } catch (error) {
    // 标记错误阶段，供 reminder-service 记录失败原因。
    const sendError = new Error(
      error && error.message
        ? error.message
        : '微信订阅消息发送失败'
    );
    sendError.stage = 'send';
    throw sendError;
  }
}

module.exports = {
  buildSubscribeMessagePayload,
  sendSubscriptionMessage
};