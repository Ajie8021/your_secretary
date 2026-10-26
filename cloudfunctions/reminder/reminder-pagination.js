
/**
 * 分批收集提醒任务。
 *
 * queryPage 负责查询指定页的数据，本模块不直接访问数据库。
 *
 * @param {Object} options 配置对象
 * @param {Function} options.queryPage 查询函数，参数为 offset、limit
 * @param {Date} options.now 当前扫描时间
 * @param {number} options.batchSize 每批数量
 * @param {number} options.maxBatches 最大批次数
 * @returns {Promise<Array>} 收集到的候选任务
 */
async function collectDueTaskPages({
  queryPage,
  now = new Date(),
  batchSize = 100,
  maxBatches = 5
}) {
  if (typeof queryPage !== 'function') {
    throw new TypeError('queryPage 必须是函数');
  }

  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TypeError('now 必须是有效的 Date 对象');
  }

  if (!Number.isInteger(batchSize) || batchSize < 1) {
    throw new TypeError('batchSize 必须是大于 0 的整数');
  }

  if (!Number.isInteger(maxBatches) || maxBatches < 1) {
    throw new TypeError('maxBatches 必须是大于 0 的整数');
  }

  const tasks = [];
  const seenIds = new Set();

  for (let page = 0; page < maxBatches; page++) {
    const offset = page * batchSize;
    const rows = await queryPage(offset, batchSize);

    if (!Array.isArray(rows)) {
      throw new TypeError('queryPage 必须返回数组');
    }

    // 防止数据库分页边界变化导致同一任务被重复加入候选列表。
    for (const task of rows) {
      if (!task || !task._id) {
        continue;
      }

      if (seenIds.has(task._id)) {
        continue;
      }

      seenIds.add(task._id);
      tasks.push(task);
    }

    // 本页不足 batchSize 条，说明当前候选数据已读取完毕。
    if (rows.length < batchSize) {
      break;
    }
  }

  return tasks;
}

module.exports = {
  collectDueTaskPages
};
