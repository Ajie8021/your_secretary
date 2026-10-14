
const test = require('node:test');
const assert = require('node:assert/strict');

const { getOrCreateUser } = require('../loginService');

function createMockRepository(initialUser = null) {
  let user = initialUser;
  let createCount = 0;

  return {
    async findByOpenid(openid) {
      if (user && user._openid === openid) {
        return user;
      }
      return null;
    },

    async create(data) {
      createCount++;

      user = {
        _id: 'test-user-id',
        ...data
      };

      return user;
    },

    getCreateCount() {
      return createCount;
    }
  };
}

test('首次登录：用户不存在时创建默认资料', async () => {
  const repository = createMockRepository();

  const user = await getOrCreateUser(
    'openid-001',
    repository
  );

  assert.equal(user._openid, 'openid-001');
  assert.equal(user.gender, '保密');
  assert.equal(user.nickname, '');
  assert.equal(repository.getCreateCount(), 1);
});

test('重复登录：用户存在时直接返回，不重复创建', async () => {
  const existingUser = {
    _id: 'user-001',
    _openid: 'openid-001',
    nickname: '测试昵称',
    gender: '保密'
  };

  const repository = createMockRepository(existingUser);

  const user = await getOrCreateUser(
    'openid-001',
    repository
  );

  assert.equal(user.nickname, '测试昵称');
  assert.equal(repository.getCreateCount(), 0);
});

test('缺少 OPENID：应拒绝处理', async () => {
  const repository = createMockRepository();

  await assert.rejects(
    getOrCreateUser('', repository),
    { message: 'OPENID_REQUIRED' }
  );

  assert.equal(repository.getCreateCount(), 0);
});

test('创建失败且重新查询仍无用户：应抛出异常', async () => {
  const repository = {
    async findByOpenid() {
      return null;
    },
    async create() {
      throw new Error('数据库写入失败');
    }
  };

  await assert.rejects(
    getOrCreateUser('openid-001', repository),
    { message: '数据库写入失败' }
  );
});
