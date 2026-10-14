/**
 * 创建成功响应。
 *
 * @param {*} data 返回给前端的数据
 * @param {string} message 提示信息
 * @returns {{code: number, message: string, data: *}}
 */
function success(data = null, message = 'ok') {
  return {
    code: 0,
    message,
    data
  };
}

/**
 * 创建失败响应。
 *
 * @param {number} code 业务错误码
 * @param {string} message 可供前端展示的提示
 * @returns {{code: number, message: string, data: null}}
 */
function failure(code, message) {
  return {
    code,
    message,
    data: null
  };
}

module.exports = {
  success,
  failure
};