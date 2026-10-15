
const cloud = require('wx-server-sdk');

const {
  success,
  failure
} = require('./response');

const {
  validateCreateTask
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
    ddl: task.ddl ? task.ddl.toISOString() : null,
    content: task.content,
    images: task.images,
    top: task.top,
    remindAt: task.remindAt
      ? task.remindAt.toISOString()
      : null,
    reminded: task.reminded,
    createTime: task.createTime.toISOString()
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
