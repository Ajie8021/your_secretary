const { toUserView, pickProfilePatch } = require('../utils');

describe('toUserView', () => {
  test('缺省字段兜底', () => {
    const v = toUserView({ createTime: 'T' });
    expect(v).toEqual({
      avatar: '', 
      nickname: '', 
      gender: '保密', 
      birthday: '', 
      address: '', 
      job: '', 
      createTime: 'T'
    });
  });
});

describe('pickProfilePatch', () => {
  test('只挑白名单字段，忽略 _openid/createTime', () => {
    const { patch, error } = pickProfilePatch({
      nickname: '小明', _openid: 'x', createTime: 'y'
    });
    expect(error).toBeNull();
    expect(patch).toEqual({ nickname: '小明' });
  });

  test('gender 非法枚举拒绝', () => {
    expect(pickProfilePatch({ 
      gender: '未知' 
    }).error).toBeTruthy();
  });

  test('birthday 格式校验', () => {
    expect(pickProfilePatch({ 
      birthday: '2005-6-1' 
    }).error).toBeTruthy();

    expect(pickProfilePatch({ 
      birthday: '2005-06-01' 
    }).error).toBeNull();
  });
  
  test('非字符串类型拒绝', () => {
    expect(
      pickProfilePatch({ job: 123 }).error
    ).toBeTruthy();
  });
  
  test('无白名单字段返回空 patch', () => {
    const { patch } = pickProfilePatch({ foo: 'bar' });
    expect(patch).toEqual({});
  });
});