/**
 * 任务提醒订阅授权工具。
 *
 * 只负责向微信申请订阅授权，不负责保存任务或发送消息。
 */

// 必须与云函数 reminder-config.js 中的模板 ID 保持一致。
const REMINDER_TEMPLATE_ID =
  'Qq8ohgLuJAKZHsjjjpqZ1_Nrgp360R0MmHS_fExKrvE';

/**
 * 申请一次任务提醒订阅授权。
 *
 * @param {Object} options 配置参数
 * @param {Function} options.requestSubscribeMessage 微信授权 API
 * @returns {Promise<Object>} 授权结果
 *
 * 返回状态：
 * accepted：用户接受授权
 * rejected：用户拒绝或当前模板未获授权
 * unavailable：当前环境不支持该 API
 * error：调用过程发生异常
 */
function requestTaskReminderSubscription({
  requestSubscribeMessage
} = {}) {
  if (typeof requestSubscribeMessage !== 'function') {
    return Promise.resolve({
      status: 'unavailable',
      message: '当前环境不支持订阅消息授权'
    });
  }

  return new Promise(resolve => {
    // 防止 success/fail 等回调异常情况下重复完成 Promise。
    let settled = false;

    const finish = result => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    try {
      requestSubscribeMessage({
        tmplIds: [REMINDER_TEMPLATE_ID],

        // 用户同意、拒绝或取消后，检查本次模板的授权结果。
        success(res) {
          if (res[REMINDER_TEMPLATE_ID] === 'accept') {
            finish({
              status: 'accepted',
              message: '用户已同意订阅提醒'
            });
          } else {
            finish({
              status: 'rejected',
              message: '用户未同意订阅提醒'
            });
          }
        },

        // 授权接口调用失败，不应导致任务无法保存。
        fail(error) {
          finish({
            status: 'error',
            message: error && error.errMsg
              ? error.errMsg
              : '订阅授权调用失败'
          });
        }
      });
    } catch (error) {
      finish({
        status: 'error',
        message: error && error.message
          ? error.message
          : '订阅授权发生异常'
      });
    }
  });
}

module.exports = {
  REMINDER_TEMPLATE_ID,
  requestTaskReminderSubscription
};