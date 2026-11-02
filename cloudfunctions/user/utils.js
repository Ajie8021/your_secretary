const PROFILE_WHITELIST = [
  'avatar', 
  'nickname', 
  'gender', 
  'birthday', 
  'address', 
  'job'
];
const GENDERS = ['男', '女', '保密'];

function ok(data = {}) { 
  return { code: 0, message: 'ok', data }; 
}
function fail(code, message) { 
  return { code, message, data: null }; 
}

/**
 * 提取用户资料视图（不含内部受控字段以外的敏感内容）
 * @param {object} doc users 文档
 */
function toUserView(doc) {
  return {
    avatar: doc.avatar || '',
    nickname: doc.nickname || '',
    gender: doc.gender || '保密',
    birthday: doc.birthday || '',
    address: doc.address || '',
    job: doc.job || '',
    createTime: doc.createTime
  };
}

/**
 * 从请求中挑出白名单字段并做类型/取值校验
 * @param {object} event 请求体
 * @returns {{patch:object, error:string|null}}
 */
function pickProfilePatch(event) {
  const patch = {};
  for (const key of PROFILE_WHITELIST) {
    if (event[key] === undefined) continue;

    const v = event[key];
    if (typeof v !== 'string') 
      return { 
        patch: null, 
        error: `${key} 必须为字符串` 
      };

    if (key === 'gender' && !GENDERS.includes(v)) {
      return { 
        patch: null, 
        error: 'gender 只能为 男/女/保密' 
      };
    }

    if (key === 'birthday' && v !== '') {
      // 简单校验 YYYY-MM-DD
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
        return { 
          patch: null, 
          error: 'birthday 格式应为 YYYY-MM-DD' 
        };
      }
    }
    patch[key] = v;
  }
  return { patch, error: null };
}

module.exports = { 
  PROFILE_WHITELIST, 
  ok, fail, 
  toUserView, 
  pickProfilePatch 
};