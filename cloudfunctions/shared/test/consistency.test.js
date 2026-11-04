/**
 * 一致性测试：各云函数 utils 的分页规范化结果应与 shared 规范源一致
 * 目的：防止某模块私自改规则导致行为漂移
 */
const shared = require('../validators');
const noteUtils = require('../../note/utils');
const feedbackUtils = require('../../feedback/utils');
const adminUtils = require('../../admin/utils');

const cases = [
  [undefined, undefined], 
  [0, 0], [1, 20], 
  ['2', '30'], 
  [-5, 999], [3, 1]
];

describe('normalizePaging 与共享口径一致', () => {
  test.each(cases)('page=%p pageSize=%p', (p, s) => {
    const expectVal = shared.normalizePaging(p, s);
    expect(noteUtils.normalizePaging(p, s)).toEqual(expectVal);
    expect(feedbackUtils.normalizePaging(p, s)).toEqual(expectVal);
    expect(adminUtils.normalizePaging(p, s)).toEqual(expectVal);
  });
});