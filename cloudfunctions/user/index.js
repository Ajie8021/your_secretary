const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const users = db.collection('users');
const { 
  ok, fail, 
  toUserView, 
  pickProfilePatch 
} = require('./utils');

/** getProfile：读取当前用户资料，不存在则补建默认记录（容错） */
async function handleGetProfile(openid) {
  const res = await users.where({ 
    _openid: openid 
  }).limit(1).get();

  if (res.data.length === 0) {
    const now = new Date();
    const doc = {
      _openid: openid, 
      avatar: '', 
      nickname: '', 
      gender: '保密',
      birthday: '', 
      address: '', 
      job: '', 
      createTime: now
    };
    await users.add({ data: doc });
    return ok({ user: toUserView(doc) });
  }
  return ok({ user: toUserView(res.data[0]) });
}

/**
 * updateProfile：仅更新白名单字段；未传字段保持原值
 * 禁止修改 _openid、createTime 等受控字段
 * （不在白名单即不会被写入）
 */
async function handleUpdateProfile(openid, event) {
  const { patch, error } = pickProfilePatch(event);
  if (error) return fail(400, error);
  if (Object.keys(patch).length === 0) 
    return fail(400, '没有可更新的资料字段');

  const res = await users.where({ 
    _openid: openid 
  }).limit(1).get();

  if (res.data.length === 0) 
    return fail(404, '用户不存在，请重新登录');

  await users.where({ 
    _openid: openid 
  }).update({ data: patch });

  const after = await users.where({ 
    _openid: openid 
  }).limit(1).get();

  return ok({ user: toUserView(after.data[0]) });
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return fail(401, '未识别当前用户');

  const action = event && event.action;
  const handlers = { 
    getProfile: handleGetProfile, 
    updateProfile: handleUpdateProfile 
  };
  const handler = handlers[action];

  if (!handler) return fail(400, `未知 action: ${action}`);

  try {
    return action === 'getProfile' ? await handler(OPENID) : await handler(OPENID, event);

  } catch (err) {
    console.error(
      '[user] action=%s error=%s', 
      action, 
      err && err.message ? err.message : err);
      
    return fail(500, '服务端错误，请稍后重试');
  }
};