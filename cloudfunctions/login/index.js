const cloud = require('wx-server-sdk');
const { success, failure } = require('./response');

// 使用当前云函数所在的云开发环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

/**
 * 将数据库中的用户记录转换为前端公开资料。
 * 不返回 _openid，避免将身份标识暴露给页面层。
 *
 * @param {Object} user 数据库用户记录
 * @returns {Object} 前端可使用的用户资料
 */
function toPublicUser(user) {
  return {
    id: user._id,
    avatar: user.avatar || '',
    nickname: user.nickname || '',
    gender: user.gender || '保密',
    birthday: user.birthday || '',
    address: user.address || '',
    job: user.job || '',
    createTime: toISOString(user.createTime)
  };
}

/**
 * 将日期转换为 ISO 8601 字符串。
 *
 * @param {Date|string} value 数据库日期
 * @returns {string|null} 标准日期字符串
 */
function toISOString(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

/**
 * 初始化用户默认资料。
 *
 * @param {string} openid 当前微信用户的 OPENID
 * @returns {Object} 初始化后的数据库用户记录
 */
async function createDefaultUser(openid) {
  const now = new Date();

  const user = {
    _openid: openid,
    avatar: '',
    nickname: '',
    gender: '保密',
    birthday: '',
    address: '',
    job: '',
    createTime: now
  };

  const result = await db.collection('users').add({
    data: user
  });

  return {
    _id: result._id,
    ...user
  };
}

/**
 * 登录云函数入口。
 *
 * 不接受客户端传入的 openid 作为身份依据。
 */
exports.main = async () => {
  try {
    // 从微信云函数上下文获取真实用户身份
    const { OPENID } = cloud.getWXContext();

    if (!OPENID) {
      return failure(401, '无法识别当前用户，请重新进入小程序');
    }

    const users = db.collection('users');

    // 查询当前用户是否已有资料
    const result = await users
      .where({
        _openid: OPENID
      })
      .limit(1)
      .get();

    let user = result.data[0];

    // 首次登录：创建默认资料
    if (!user) {
      try {
        user = await createDefaultUser(OPENID);
      } catch (createError) {
        /*
         * 首次登录可能发生并发请求：
         * 两个请求同时查询到用户不存在，随后同时尝试创建。
         * 创建失败后再次查询；如果另一个请求已创建成功，
         * 则直接使用已有记录，避免简单地把并发情况判定为登录失败。
         */
        const retryResult = await users
          .where({
            _openid: OPENID
          })
          .limit(1)
          .get();

        if (retryResult.data.length > 0) {
          user = retryResult.data[0];
        } else {
          throw createError;
        }
      }
    }

    return success(
      {
        user: toPublicUser(user)
      },
      '登录初始化成功'
    );
  } catch (error) {
    // 详细异常仅记录在云函数日志中
    console.error('login cloud function failed:', error);

    return failure(500, '登录初始化失败，请稍后重试');
  }
};