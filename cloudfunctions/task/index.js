
const cloud = require('wx-server-sdk');

const {
  success,
  failure
} = require('./response');

const {
  validateCreateTask,
  parsePagination,
  validateUpdateTask,
  hasReminderConfigChanged
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
    createTime: toISOString(task.createTime),
    completed: Boolean(task.completed)
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
    createTime: now,
    completed: false
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

/**
 * 查询当前用户的一条任务详情。
 */
async function getTaskDetail(id, openid) {
  if (typeof id !== 'string' || id.trim() === '') {
    return failure(400, '任务 ID 不能为空');
  }

  const result = await db.collection('tasks')
    .where({
      _id: id.trim(),
      _openid: openid
    })
    .limit(1)
    .get();

  if (result.data.length === 0) {
    // 不区分任务不存在和任务属于其他用户，
    // 避免泄露其他用户是否拥有该任务。
    return failure(404, '任务不存在或无权访问');
  }

  return success({
    task: toPublicTask(result.data[0])
  }, '查询任务详情成功');
}

/**
 * 修改当前用户自己的任务。
 */
async function updateTask(id, input, openid) {
  if (typeof id !== 'string' || id.trim() === '') {
    return failure(400, '任务 ID 不能为空');
  }

  const validation = validateUpdateTask(input);

  if (!validation.valid) {
    return failure(400, validation.errors.join('；'));
  }

  const taskId = id.trim();
  const collection = db.collection('tasks');

  // 先验证任务存在且属于当前用户。
  const result = await collection.where({
    _id: taskId,
    _openid: openid
  }).limit(1).get();

  if (result.data.length === 0) {
    return failure(404, '任务不存在或无权访问');
  }

  const currentTask = result.data[0];
  const changes = validation.data;

  // 只有提醒时间配置实际发生变化时，才重置提醒发送状态。
  const reminderConfigChanged = hasReminderConfigChanged(
    currentTask,
    changes
  );
  
  if (reminderConfigChanged) {
    changes.reminded = false;
  }

  // 再次把 ID 和用户身份放入更新条件，避免更新其他用户的任务。
  const updateResult = await collection.where({
    _id: taskId,
    _openid: openid
  }).update({
    data: changes
  });

  if (!updateResult.stats || updateResult.stats.updated === 0) {
    return failure(404, '任务不存在或无权访问');
  }

  return success({
    id: taskId,
    updatedFields: Object.keys(validation.data)
  }, '任务修改成功');
}

/**
 * 删除当前用户自己的任务。
 */
async function deleteTask(id, openid) {
  if (typeof id !== 'string' || id.trim() === '') {
    return failure(400, '任务 ID 不能为空');
  }

  const result = await db.collection('tasks').where({
    _id: id.trim(),
    _openid: openid
  }).remove();

  if (!result.stats || result.stats.removed === 0) {
    return failure(404, '任务不存在或无权访问');
  }

  return success({
    id: id.trim()
  }, '任务删除成功');
}

/**
 * 切换任务置顶状态。
 */
async function toggleTaskTop(id, openid) {
  if (typeof id !== 'string' || id.trim() === '') {
    return failure(400, '任务 ID 不能为空');
  }

  const collection = db.collection('tasks');

  const result = await collection.where({
    _id: id.trim(),
    _openid: openid
  }).limit(1).get();

  if (result.data.length === 0) {
    return failure(404, '任务不存在或无权访问');
  }

  const current = result.data[0];
  const nextTop = !Boolean(current.top);

  const updateResult = await collection.where({
    _id: id.trim(),
    _openid: openid
  }).update({
    data: {
      top: nextTop
    }
  });

  if (!updateResult.stats || updateResult.stats.updated === 0) {
    return failure(404, '任务不存在或无权访问');
  }

  return success({
    id: id.trim(),
    top: nextTop
  }, nextTop ? '任务已置顶' : '已取消置顶');
}

/**
 * 切换任务完成状态。
 */
async function toggleTaskComplete(id, openid) {
  if (typeof id !== 'string' || id.trim() === '') {
    return failure(400, '任务 ID 不能为空');
  }

  const collection = db.collection('tasks');

  const result = await collection.where({
    _id: id.trim(),
    _openid: openid
  }).limit(1).get();

  if (result.data.length === 0) {
    return failure(404, '任务不存在或无权访问');
  }

  const current = result.data[0];
  const nextCompleted = !Boolean(current.completed);

  const updateResult = await collection.where({
    _id: id.trim(),
    _openid: openid
  }).update({
    data: {
      completed: nextCompleted
    }
  });

  if (!updateResult.stats || updateResult.stats.updated === 0) {
    return failure(404, '任务不存在或无权访问');
  }

  return success({
    id: id.trim(),
    completed: nextCompleted
  }, nextCompleted ? '任务已完成' : '任务已恢复为未完成');
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

      case 'list':
        return await listTasks(event, OPENID);

      case 'detail':
        return await getTaskDetail(event.id, OPENID);

      case 'update':
        return await updateTask(event.id, event.data, OPENID);

      case 'delete':
        return await deleteTask(event.id, OPENID);

      case 'toggleTop':
        return await toggleTaskTop(event.id, OPENID);

      case 'toggleComplete':
        return await toggleTaskComplete(event.id, OPENID);

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
