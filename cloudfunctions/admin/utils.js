const PAGE_DEFAULT = 1;
const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 100;

/**
 * 反馈视图（管理端）
 * @param {object} doc feedbacks 文档
 * @returns 含 id/content/reply/repliedAt/replied/createTime
 */
function toAdminFeedbackView(doc) {
  const reply = doc.reply || '';
  return {
    id: doc._id,
    content: doc.content,
    reply,
    repliedAt: doc.repliedAt || null,
    replied: !!reply,
    createTime: doc.createTime
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

/**
 * 校验回复内容
 * @param {*} reply
 * @returns {string|null} 规范化后的文本；不合法返回 null
 */
function normalizeReply(reply) {
  if (typeof reply !== 'string') return null;
  const t = reply.trim();
  return t ? t : null;
}

module.exports = { 
  toAdminFeedbackView, 
  normalizePaging, 
  normalizeReply 
};