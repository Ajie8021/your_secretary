const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const admins = db.collection('admins');
const feedbacks = db.collection('feedbacks');
const { 
  ok, fail, 
  toAdminFeedbackView, 
  normalizePaging, 
  normalizeReply 
} = require('./utils');

/**
 * 鉴权：查询当前 openid 是否在 admins 白名单
 * 每次管理操作都必须调用，不能依赖前端
 * @param {string} openid
 * @returns {Promise<boolean>}
 */
async function isAdmin(openid) {
  const res = await admins.where({ 
    _openid: openid 
  }).limit(1).get();
  return res.data.length > 0;
}

/**
 * check：检查管理员身份
 * 普通用户也返回成功，isAdmin=false，用于控制入口显示
 * @param {string} openid
 */
async function handleCheck(openid) {
  const admin = await isAdmin(openid);
  return ok({ isAdmin: admin });
}

/**
 * listFeedbacks：管理员分页查询全部反馈，createTime 降序
 * @param {string} openid
 * @param {object} event {page,pageSize}
 */
async function handleListFeedbacks(openid, event) {
  if (!(await isAdmin(openid))) 
    return fail(403, '无管理员权限');

  const { page, pageSize } = normalizePaging(
    event.page, 
    event.pageSize
  );
  const countRes = await feedbacks.count();
  const total = countRes.total;
  const listRes = await feedbacks
    .orderBy('createTime', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();

  return ok({
    list: listRes.data.map(toAdminFeedbackView),
    total, page, pageSize, 
    hasMore: page * pageSize < total
  });
}

/**
 * replyFeedback：管理员回复反馈，一条反馈只允许回复一次
 * @param {string} openid
 * @param {object} event {id, reply}
 */
async function handleReplyFeedback(openid, event) {
  if (!(await isAdmin(openid))) 
    return fail(403, '无管理员权限');

  const id = event.id;
  if (!id || typeof id !== 'string') 
    return fail(400, 'id 不能为空');

  const reply = normalizeReply(event.reply);
  if (!reply) return fail(400, '回复内容不能为空');

  // 先查记录是否存在、是否已回复
  const byId = await feedbacks
    .where({ _id: id })
    .limit(1)
    .get();
  if (byId.data.length === 0) return fail(404, '反馈不存在');
  if (byId.data[0].reply) return fail(409, '该反馈已回复');

  const now = new Date();
  await feedbacks.where({ _id: id }).update({
    data: { reply, repliedAt: now }
  });

  const after = await feedbacks
    .where({ _id: id })
    .limit(1)
    .get();

  return ok({ 
    feedback: toAdminFeedbackView(after.data[0]) 
  });
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return fail(401, '未识别当前用户');

  const action = event && event.action;
  const handlers = {
    check: (oid) => handleCheck(oid),
    listFeedbacks: handleListFeedbacks,
    replyFeedback: handleReplyFeedback
  };
  const handler = handlers[action];
  if (!handler) return fail(400, `未知 action: ${action}`);

  try {
    return await handler(OPENID, event);
  } catch (err) {
    console.error(
      '[admin] action=%s code=%s msg=%s stack=%s',
      action,
      err && err.errCode,
      err && err.errMsg ? err.errMsg : (err && err.message),
      err && err.stack
    );
    return fail(500, '服务端错误，请稍后重试');
  }
};