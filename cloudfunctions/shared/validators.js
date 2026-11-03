/**
 * 跨模块共享的校验/规范化纯函数（规范源）
 * 说明：云函数按目录打包，运行时各自 require 本目录 utils.js；
 * 本文件用于统一口径、单测与文档比对，防止各模块规则漂移。
 */

const PAGE_DEFAULT = 1;
const PAGE_SIZE_DEFAULT = 20;
const PAGE_SIZE_MAX = 100;

/**
 * 分页参数规范化
 * @param {*} page 原始页码
 * @param {*} pageSize 原始每页条数
 * @returns {{page:number,pageSize:number}} page>=1，1<=pageSize<=100
 */
function normalizePaging(page, pageSize) {
  let p = parseInt(page, 10);
  let s = parseInt(pageSize, 10);
  if (!Number.isInteger(p) || p < 1) p = PAGE_DEFAULT;
  if (!Number.isInteger(s) || s < 1) s = PAGE_SIZE_DEFAULT;
  if (s > PAGE_SIZE_MAX) s = PAGE_SIZE_MAX;
  return { page: p, pageSize: s };
}

/**
 * 校验四象限等级
 * @param {*} level
 * @returns {boolean} 是否为 1–4 的整数
 */
function isValidLevel(level) {
  return Number.isInteger(level) && level >= 1 && level <= 4;
}

/**
 * 校验云存储 fileID 数组
 * @param {*} images 允许 undefined/null 表示未传
 * @returns {boolean}
 */
function isValidImages(images) {
  if (images === undefined || images === null) return true;
  if (!Array.isArray(images)) return false;
  return images.every(
    i => typeof i === 'string' && i.length > 0
  );
}

/**
 * 校验并规范化日期输入
 * @param {*} v ISO 字符串或 Date
 * @returns {Date|null} 合法返回 Date，非法返回 null
 */
function toValidDate(v) {
  if (v === null || v === undefined || v === '') return null;
  const d = v instanceof Date ? v : new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * 校验提醒时间：合法且不晚于 ddl，且未过期
 * @param {*} remindAt 提醒时间（可空）
 * @param {Date} ddl 截止时间
 * @param {Date} now 当前时间
 * @returns {{ok:boolean, reason?:string}}
 */
function checkRemindAt(remindAt, ddl, now) {
  if (remindAt === null 
    || remindAt === undefined 
    || remindAt === '') 
    return { ok: true };

  const r = toValidDate(remindAt);
  if (!r) return { ok: false, reason: '提醒时间格式非法' };

  if (!(ddl instanceof Date) || isNaN(ddl.getTime())) 
    return { ok: false, reason: 'ddl 非法' };

  if (r.getTime() > ddl.getTime()) 
    return { ok: false, reason: '提醒时间不得晚于截止时间' };

  if (r.getTime() <= now.getTime()) 
    return { ok: false, reason: '提醒时间已过期' };

  return { ok: true };
}

module.exports = {
  PAGE_DEFAULT, 
  PAGE_SIZE_DEFAULT, 
  PAGE_SIZE_MAX,
  normalizePaging, 
  isValidLevel, 
  isValidImages, 
  toValidDate, 
  checkRemindAt
};