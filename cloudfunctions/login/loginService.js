
/**
 * 登录业务服务。
 * 通过依赖注入接收数据库操作，便于单元测试。
 */

/**
 * 获取用户资料；首次登录时创建默认资料。
 *
 * @param {string} openid 当前用户的服务端身份标识
 * @param {Object} userRepository 用户数据访问对象
 * @returns {Promise<Object>} 用户记录
 */
async function getOrCreateUser(openid, userRepository) {
  if (!openid) {
    throw new Error('OPENID_REQUIRED');
  }

  let user = await userRepository.findByOpenid(openid);

  if (user) {
    return user;
  }

  try {
    return await userRepository.create({
      _openid: openid,
      avatar: '',
      nickname: '',
      gender: '保密',
      birthday: '',
      address: '',
      job: '',
      createTime: new Date()
    });
  } catch (error) {
    // 处理并发首次登录：重新查询是否已由另一个请求创建
    user = await userRepository.findByOpenid(openid);

    if (user) {
      return user;
    }

    throw error;
  }
}

module.exports = {
  getOrCreateUser
};
