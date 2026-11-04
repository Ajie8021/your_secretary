// cloudfunctions/note/utils.js
const DEFAULT_TITLE = '无题';
const PAGE_DEFAULT = 1;
const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 100;

/**
 * 将数据库记录转为对外对象
 * 对外用 id 代替 _id，且不暴露 _openid
 * @param {object} doc 数据库文档
 */
function toNoteView(doc) {
  return {
    id: doc._id,
    title: doc.title,
    content: doc.content,
    images: doc.images || [],
    top: !!doc.top,
    createTime: doc.createTime
  };
}

/**
 * 规范化分页参数，保证 page>=1、1<=pageSize<=100
 * @param {number} page 原始页码
 * @param {number} pageSize 原始每页条数
 * @returns {{page:number, pageSize:number}}
 */
function normalizePaging(page, pageSize) {
  let p = parseInt(page, 10);
  let s = parseInt(pageSize, 10);
  if (!Number.isInteger(p) || p < 1) 
    p = PAGE_DEFAULT;
  if (!Number.isInteger(s) || s < 1) 
    s = PAGE_SIZE_DEFAULT;
  if (s > PAGE_SIZE_MAX) 
    s = PAGE_SIZE_MAX;
  return { page: p, pageSize: s };
}

/**
 * 校验图片数组：必须是字符串数组（云存储 fileID）
 * 允许空数组
 * @param {*} images
 * @returns {boolean}
 */
function isValidImages(images) {
  if (images === undefined || images === null) 
    return true;
  if (!Array.isArray(images)) 
    return false;
  return images.every(
    item => typeof item === 'string' 
    && item.length > 0
  );
}

module.exports = { 
  DEFAULT_TITLE, 
  toNoteView, 
  normalizePaging, 
  isValidImages 
};