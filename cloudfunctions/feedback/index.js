const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const feedbacks = db.collection('feedbacks');
const { success, failure } = require('./response');
const { 
  toFeedbackView, 
  normalizePaging 
} = require('./utils');

/**
 * listMine：查询本人反馈，createTime 降序，分页
 * @param {string} openid
 * @param {object} event {page,pageSize}
 */
async function handleListMine(openid, event) {
  const { page, pageSize } = normalizePaging(
    event.page, 
    event.pageSize
  );
  const where = { _openid: openid };
  const countRes = await feedbacks.where(where).count();
  const total = countRes.total;
  const listRes = await feedbacks
    .where(where)
    .orderBy('createTime', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();

  return success({
    list: listRes.data.map(toFeedbackView), total, page, pageSize, 
    hasMore: page * pageSize < total
  });
}

/**
 * create：提交反馈
 * @param {string} openid
 * @param {object} event {content}
 */
async function handleCreate(openid, event) {
  const content = typeof event.content === 'string' ? event.content.trim() : '';
  if (!content) 
    return failure(400, '反馈内容不能为空');
  const doc = {
    _openid: openid, content, 
    reply: '', 
    repliedAt: null, 
    createTime: new Date()
  };
  const addRes = await feedbacks.add({ data: doc });
  return success({ 
    feedback: toFeedbackView({ _id: addRes._id, ...doc }) 
  });
}

/**
 * update：仅允许修改本人且未回复的反馈
 * 已回复返回 409；非本人/不存在返回 404
 * @param {string} openid
 * @param {object} event {id, content}
 */
async function handleUpdate(openid, event) {
  const id = event.id;
  if (!id || typeof id !== 'string') 
    return failure(400, 'id 不能为空');
  const content = typeof event.content === 'string' ? event.content.trim() : '';
  if (!content) 
    return failure(400, '反馈内容不能为空');

  // 先按 id 查（不限定 openid），用于区分"不存在/非本人"与"已回复"
  const byId = await feedbacks.where({ 
    _id: id 
  }).limit(1).get();

  if (byId.data.length === 0) 
    return failure(404, '反馈不存在');

  const doc = byId.data[0];
  if (doc._openid !== openid) 
    return failure(404, '反馈不存在'); // 不泄露他人数据存在性
  if (doc.reply) 
    return failure(409, '反馈已回复，不能再修改');

  await feedbacks.where({ 
    _id: id, _openid: openid 
  }).update({ data: { content } });

  const after = await feedbacks.where({ 
    _id: id, _openid: openid 
  }).limit(1).get();
  return success({ feedback: toFeedbackView(after.data[0]) });
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return failure(401, '未识别当前用户');

  const action = event && event.action;
  const handlers = { 
    listMine: handleListMine, 
    create: handleCreate, 
    update: handleUpdate 
  };
  const handler = handlers[action];

  if (!handler) 
    return failure(400, `未知 action: ${action}`);

  try {
    return await handler(OPENID, event);
  } catch (err) {
    console.error(
      '[feedback] action=%s error=%s', 
      action, 
      err && err.message ? err.message : err
    );
    return failure(500, '服务端错误，请稍后重试');
  }
};
