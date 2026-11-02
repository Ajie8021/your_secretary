const PAGE_DEFAULT = 1;
const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 100;

function ok(data = {}) { 
  return { code: 0, message: 'ok', data }; 
}
function fail(code, message) { 
  return { code, message, data: null }; 
}

/**
 * 反馈视图：对外用 id，不暴露 _openid
 * 附带 replied 布尔便于前端判断是否可编辑
 * @param {object} doc feedbacks 文档
 */
function toFeedbackView(doc) {
  const reply = doc.reply || '';
  return {
    id: doc._id,
    content: doc.content,
    reply,
    repliedAt: doc.repliedAt || null,
    createTime: doc.createTime,
    replied: !!reply
  };
}

function normalizePaging(page, pageSize) {
  let p = parseInt(page, 10);
  let s = parseInt(pageSize, 10);

  if (!Number.isInteger(p) || p < 1) p = PAGE_DEFAULT;
  if (!Number.isInteger(s) || s < 1) s = PAGE_SIZE_DEFAULT;
  if (s > PAGE_SIZE_MAX) s = PAGE_SIZE_MAX;

  return { page: p, pageSize: s };
}

module.exports = { 
  ok, fail, 
  toFeedbackView, 
  normalizePaging 
};