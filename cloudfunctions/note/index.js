const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const notes = db.collection('notes');

// ======================== 公共常量与工具 ========================

const PAGE_DEFAULT = 1;
const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 100;

const {
  DEFAULT_TITLE, 
  ok, fail, 
  toNoteView, 
  normalizePaging, 
  isValidImages
} = require("/utils");

/**
 * 按 id + 当前用户 openid 查询随笔；不存在或不属于当前用户返回 null
 * @param {string} id 随笔 id
 * @param {string} openid 当前用户
 */
async function findOwnNote(id, openid) {
  if (!id || typeof id !== 'string') return null;
  const res = await notes.where({ _id: id, _openid: openid }).limit(1).get();
  return res.data && res.data.length > 0 ? res.data[0] : null;
}

// ======================== action 处理 ========================

/**
 * list：查询当前用户随笔列表
 * 排序：top 降序、createTime 降序
 * 参数：page、pageSize（可选）
 */
async function handleList(openid, event) {
  const { 
    page, pageSize 
  } = normalizePaging(event.page, event.pageSize);
  const where = { _openid: openid };

  const countRes = await notes.where(where).count();
  const total = countRes.total;

  const listRes = await notes
    .where(where)
    .orderBy('top', 'desc')
    .orderBy('createTime', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .field({
      // 列表页不返回完整正文，只给摘要；统一截断 80 字符
      title: true,
      content: true,
      images: true,
      top: true,
      createTime: true
    })
    .get();

  const list = listRes.data.map(doc => {
    const view = toNoteView(doc);
    // 列表摘要：正文截断，避免列表页传输全文
    view.summary = (view.content || '').slice(0, 80);
    delete view.content;
    return view;
  });

  return ok({
    list,
    total,
    page,
    pageSize,
    hasMore: page * pageSize < total
  });
}

/**
 * detail：查询本人随笔详情
 * 参数：id
 */
async function handleDetail(openid, event) {
  const doc = await findOwnNote(event.id, openid);
  if (!doc) return fail(404, '随笔不存在或无权访问');
  return ok({ note: toNoteView(doc) });
}

/**
 * create：创建随笔
 * 参数：title（可选，空则"无题"）、content（必填）、images（可选）
 * 服务端写入 _openid、top=false、createTime
 */
async function handleCreate(openid, event) {
  const titleRaw = typeof event.title === 'string' ? event.title.trim() : '';
  const title = titleRaw || DEFAULT_TITLE;
  const content = typeof event.content === 'string' ? event.content.trim() : '';

  if (!content) return fail(400, '随笔正文不能为空');
  if (!isValidImages(event.images)) return fail(400, 'images 必须为 fileID 字符串数组');

  const now = new Date();
  const doc = {
    _openid: openid,
    title,
    content,
    images: event.images || [],
    top: false,
    createTime: now
  };

  const addRes = await notes.add({ data: doc });
  return ok({
    note: toNoteView({ _id: addRes._id, ...doc })
  });
}

/**
 * update：修改随笔
 * 参数：id（必填），以及 title/content/images 中任意可编辑字段
 * 规则：未传字段保持原值；title 空则"无题"；content 传入则不得为空；
 * 禁止修改 _openid、createTime、top
 */
async function handleUpdate(openid, event) {
  const doc = await findOwnNote(event.id, openid);
  if (!doc) return fail(404, '随笔不存在或无权访问');

  const patch = {};

  if (event.title !== undefined) {
    const t = typeof event.title === 'string' ? event.title.trim() : '';
    patch.title = t || DEFAULT_TITLE;
  }
  if (event.content !== undefined) {
    const c = typeof event.content === 'string' ? event.content.trim() : '';
    if (!c) return fail(400, '随笔正文不能为空');
    patch.content = c;
  }
  if (event.images !== undefined) {
    if (!isValidImages(event.images)) 
      return fail(400, 'images 必须为 fileID 字符串数组');
    patch.images = event.images;
  }

  if (Object.keys(patch).length === 0) 
    return fail(400, '没有可更新的字段');

  await notes.where({ 
    _id: event.id, _openid: openid 
  }).update({ data: patch });

  const updated = await findOwnNote(event.id, openid);
  return ok({ note: toNoteView(updated) });
}

/**
 * delete：删除随笔
 * 参数：id
 */
async function handleDelete(openid, event) {
  const doc = await findOwnNote(event.id, openid);
  if (!doc) return fail(404, '随笔不存在或无权访问');

  await notes.where({ _id: event.id, _openid: openid }).remove();
  // 说明：云存储图片清理属于独立策略。MVP 可先记录待清理日志，
  // 由后续清理任务统一处理，避免删记录与删文件非原子导致误删。
  return ok({ id: event.id, deleted: true });
}

/**
 * toggleTop：切换置顶
 * 参数：id
 */
async function handleToggleTop(openid, event) {
  const doc = await findOwnNote(event.id, openid);
  if (!doc) return fail(404, '随笔不存在或无权访问');

  const next = !doc.top;
  await notes.where({ 
    _id: event.id, _openid: openid 
  }).update({ data: { top: next } });
  return ok({ id: event.id, top: next });
}

// ======================== 入口 ========================

/**
 * 云函数入口
 * 身份以云函数上下文 OPENID 为准，忽略客户端传入的身份字段
 */
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return fail(401, '未识别当前用户');

  const action = event && event.action;
  const handlers = {
    list: handleList,
    detail: handleDetail,
    create: handleCreate,
    update: handleUpdate,
    delete: handleDelete,
    toggleTop: handleToggleTop
  };

  const handler = handlers[action];
  if (!handler) return fail(400, `未知 action: ${action}`);

  try {
    return await handler(OPENID, event);
  } catch (err) {
    console.error('[note] action=%s error=%s', action, err && err.message ? err.message : err);
    return fail(500, '服务端错误，请稍后重试');
  }
};