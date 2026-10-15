
const cloud = require('wx-server-sdk');

const {
  success,
  failure
} = require('./response');

const {
  validateCreateTask,
  parsePagination
} = require('./validation');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 将数据库中的任务转换为返回前端的对象。
 * 内部身份字段 _openid 不返回给前端。
 */
function toPublicTask(task) {
  return {
    id: task._id,
    name: task.name,
    type: task.type,
    level: task.level,
    ddl: toISOString(task.ddl),
    content: task.content,
    images: task.images || [],
    top: Boolean(task.top),
    remindAt: toISOString(task.remindAt),
    reminded: Boolean(task.reminded),
    createTime: toISOString(task.createTime)
  };
}

/**
 * 创建任务。
 */
async function createTask(input, openid) {
  const validation = validateCreateTask(input);

  if (!validation.valid) {
    return failure(
      400,
      validation.errors.join('；')
    );
  }

  const now = new Date();

  // 由服务端构造数据库记录，不直接保存前端传入的对象。
  const task = {
    _openid: openid,
    name: validation.data.name,
    type: validation.data.type,
    level: validation.data.level,
    ddl: validation.data.ddl,
    content: validation.data.content,
    images: validation.data.images,
    top: false,
    remindAt: validation.data.remindAt,
    reminded: false,
    createTime: now
  };

  const result = await db.collection('tasks').add({
    data: task
  });

  return success(
    {
      task: toPublicTask({
        _id: result._id,
        ...task
      })
    },
    '任务创建成功'
  );
}

/**
 * 云函数统一入口。
 *
 * 当前支持：
 * action = create
 */
exports.main = async (event) => {
  try {
    const { OPENID } = cloud.getWXContext();

    if (!OPENID) {
      return failure(
        401,
        '无法识别当前用户，请重新进入小程序'
      );
    }

    if (!event || typeof event.action !== 'string') {
      return failure(400, '缺少操作类型 action');
    }

    switch (event.action) {
      case 'create':
        return await createTask(event.data, OPENID);

      default:
        return failure(400, '不支持的任务操作');
    }
  } catch (error) {
    console.error('task cloud function failed:', error);

    return failure(
      500,
      '任务操作失败，请稍后重试'
    );
  }
};

/**
 * 添加统一日期转换函数。
 * 避免数据库返回值的类型差异导致转换异常；
 * 支持任务列表和任务详情共用同一个转换函数。
 */
function toISOString(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

/**
 * 查询当前用户的任务列表。
 */
async function listTasks(input, openid) {
  const pagination = parsePagination(input || {});

  if (!pagination.valid) {
    return failure(400, pagination.errors.join('；'));
  }

  const { page, pageSize, skip } = pagination.data;

  // 用户身份来自云函数上下文，不来自前端参数。
  const collection = db.collection('tasks');
  const query = collection.where({
    _openid: openid
  });

  // 获取当前用户的任务总数，用于前端分页显示。
  const countResult = await query.count();

  // 先按置顶、等级、截止时间、创建时间排序，再分页。
  const result = await query
    .orderBy('top', 'desc')
    .orderBy('level', 'desc')
    .orderBy('ddl', 'asc')
    .orderBy('createTime', 'desc')
    .skip(skip)
    .limit(pageSize)
    .get();

  return success({
    list: result.data.map(toPublicTask),
    pagination: {
      page,
      pageSize,
      total: countResult.total,
      totalPages: Math.ceil(countResult.total / pageSize)
    }
  }, '查询任务列表成功');
}
