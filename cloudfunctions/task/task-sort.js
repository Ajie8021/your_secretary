
/**
 * 任务列表排序规则。
 *
 * 排序优先级：
 * 1. 置顶任务优先；
 * 2. 任务等级降序：4、3、2、1；
 * 3. 截止时间升序：越早越靠前，未设置截止时间的任务排在后面；
 * 4. 创建时间降序：越新创建的任务越靠前。
 *
 * 本模块不依赖微信云开发环境，可以单独进行单元测试。
 */

function toTimestamp(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const timestamp = value instanceof Date
    ? value.getTime()
    : new Date(value).getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
}

/**
 * 比较两个任务的先后顺序。
 * 返回负数表示 a 在前，正数表示 b 在前，0 表示排序字段相同。
 */
function compareTasks(a, b) {
  // 第一优先级：置顶任务优先。
  const topA = a.top === true ? 1 : 0;
  const topB = b.top === true ? 1 : 0;

  if (topA !== topB) {
    return topB - topA;
  }

  // 第二优先级：等级从高到低。
  const levelA = Number.isFinite(a.level) ? a.level : 0;
  const levelB = Number.isFinite(b.level) ? b.level : 0;

  if (levelA !== levelB) {
    return levelB - levelA;
  }

  // 第三优先级：有截止时间的任务优先，按时间从早到晚。
  const ddlA = toTimestamp(a.ddl);
  const ddlB = toTimestamp(b.ddl);

  if (ddlA === null && ddlB !== null) return 1;
  if (ddlA !== null && ddlB === null) return -1;

  if (ddlA !== null && ddlB !== null && ddlA !== ddlB) {
    return ddlA - ddlB;
  }

  // 第四优先级：创建时间从新到旧。
  const createA = toTimestamp(a.createTime);
  const createB = toTimestamp(b.createTime);

  if (createA === null && createB !== null) return 1;
  if (createA !== null && createB === null) return -1;

  if (createA !== null && createB !== null) {
    return createB - createA;
  }

  // 所有排序字段都相同时，不额外改变相对顺序。
  return 0;
}

/**
 * 返回排序后的新数组，不修改传入的原数组。
 */
function sortTasks(tasks) {
  return [...tasks].sort(compareTasks);
}

module.exports = {
  toTimestamp,
  compareTasks,
  sortTasks
};
