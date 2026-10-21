
/**
 * 构造到期提醒任务的数据库查询条件。
 *
 * @param {Object} dbCommand 微信云数据库 command 对象
 * @param {Date} now 本次扫描时间
 * @returns {Object} 可传入 tasks 集合 where() 的查询条件
 */
function buildDueTaskQuery(dbCommand, now) {
  if (!dbCommand || typeof dbCommand.lte !== 'function') {
    throw new TypeError('dbCommand 必须提供 lte 方法');
  }

  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TypeError('now 必须是有效的 Date 对象');
  }

  return {
    reminded: false,
    remindAt: dbCommand.lte(now)
  };
}

module.exports = {
  buildDueTaskQuery
};
