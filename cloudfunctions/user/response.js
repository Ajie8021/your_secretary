/**
 * 云函数统一响应结构。
 * 本文件在各云函数目录各存一份，内容必须完全一致；
 * 用一致性单测防止各模块私自修改。
 */

/**
 * 成功响应
 * @param {*} data 业务数据
 * @param {string} message 提示信息，默认 ok
 */
function success(data = null, message = 'ok') {
  return { code: 0, message, data };
}

/**
 * 失败响应
 * @param {number} code 错误码（400/401/403/404/409/500）
 * @param {string} message 可展示信息
 */
function failure(code, message) {
  return { code, message, data: null };
}

module.exports = { success, failure };