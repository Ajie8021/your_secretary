const { toNoteView, normalizePaging, isValidImages } = require('../utils');

describe('toNoteView', () => {
  test('转换字段并隐藏 _openid', () => {
    const view = toNoteView({
      _id: 'n1', _openid: 'o1', title: 't', content: 'c',
      images: ['f1'], top: 1, createTime: '2026-10-14T00:00:00.000Z'
    });
    expect(view).toEqual({
      id: 'n1', title: 't', content: 'c', images: ['f1'],
      top: true, createTime: '2026-10-14T00:00:00.000Z'
    });
    expect(view._openid).toBeUndefined();
  });

  test('images 缺省时返回空数组', () => {
    const view = toNoteView({ _id: 'n1', title: 't', content: 'c', top: false });
    expect(view.images).toEqual([]);
  });
});

describe('normalizePaging', () => {
  test('缺省使用默认值', () => {
    expect(normalizePaging(undefined, undefined)).toEqual({ page: 1, pageSize: 20 });
  });
  test('非法页码回退', () => {
    expect(normalizePaging(0, 10)).toEqual({ page: 1, pageSize: 10 });
    expect(normalizePaging('abc', 'xyz')).toEqual({ page: 1, pageSize: 20 });
  });
  test('pageSize 上限 100', () => {
    expect(normalizePaging(1, 999)).toEqual({ page: 1, pageSize: 100 });
  });
});

describe('isValidImages', () => {
  test('空/未传合法', () => {
    expect(isValidImages(undefined)).toBe(true);
    expect(isValidImages([])).toBe(true);
  });
  test('字符串数组合法', () => {
    expect(isValidImages(['cloud://a', 'cloud://b'])).toBe(true);
  });
  test('非数组或含非法元素拒绝', () => {
    expect(isValidImages('x')).toBe(false);
    expect(isValidImages([1])).toBe(false);
    expect(isValidImages([''])).toBe(false);
    expect(isValidImages([null])).toBe(false);
  });
});