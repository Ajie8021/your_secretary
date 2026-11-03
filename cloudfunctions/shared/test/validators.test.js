const {
  normalizePaging, 
  isValidLevel, 
  isValidImages, 
  toValidDate, 
  checkRemindAt
} = require('../validators');

describe('normalizePaging', () => {
  test(
    '缺省默认', 
    () => expect(normalizePaging())
    .toEqual({ 
      page: 1, pageSize: 20 
    })
  );

  test(
    '非法回退', 
    () => expect(normalizePaging(-1, 'x'))
    .toEqual({ 
      page: 1, pageSize: 20 
    })
  );

  test(
    '上限 100', 
    () => expect(normalizePaging(2, 1000))
    .toEqual({ 
      page: 2, pageSize: 100 
    })
  );

  test(
    '字符串数字可解析', 
    () => expect(normalizePaging('3', '15'))
    .toEqual({ 
      page: 3, pageSize: 15 
    })
  );
});

describe('isValidLevel', () => {
  test(
    '合法 1-4', 
    () => [1, 2, 3, 4].forEach(
      l => expect(isValidLevel(l)).toBe(true)
    )
  );

  test('非法', () => {
    [0, 5, -1, 1.5, '2', null, undefined].forEach(
      l => expect(isValidLevel(l)).toBe(false)
    );
  });
});

describe('isValidImages', () => {
  test('空合法', () => {
    expect(isValidImages()).toBe(true);
    expect(isValidImages(null)).toBe(true);
    expect(isValidImages([])).toBe(true);
  });

  test(
    '字符串数组', 
    () => expect(isValidImages(['a', 'b'])).toBe(true)
  );

  test('非法', () => {
    expect(isValidImages('a')).toBe(false);
    expect(isValidImages([1])).toBe(false);
    expect(isValidImages([''])).toBe(false);
    expect(isValidImages([null])).toBe(false);
  });
});

describe('toValidDate', () => {
  test('合法 ISO', () => {
    const d = toValidDate('2026-10-20T15:59:00.000Z');
    expect(d instanceof Date).toBe(true);
    expect(d.getTime())
      .toBe(Date.UTC(2026, 9, 20, 15, 59, 0));
  });

  test('空返回 null', () => {
    expect(toValidDate('')).toBeNull();
    expect(toValidDate(null)).toBeNull();
    expect(toValidDate(undefined)).toBeNull();
  });

  test(
    '非法字符串返回 null', 
    () => expect(toValidDate('abc')).toBeNull()
  );
});

describe('checkRemindAt', () => {
  const now = new Date('2026-10-14T00:00:00.000Z');
  const ddl = new Date('2026-10-20T00:00:00.000Z');

  test(
    '空提醒合法（不设置）', 
    () => expect(
      checkRemindAt(null, ddl, now).ok
    ).toBe(true)
  );

  test('合法提醒', () => {
    const r = checkRemindAt('2026-10-19T00:00:00.000Z', ddl, now);
    expect(r.ok).toBe(true);
  });

  test('晚于 ddl 拒绝', () => {
    expect(
      checkRemindAt('2026-10-21T00:00:00.000Z', ddl, now).ok
    ).toBe(false);
  });

  test('已过期拒绝', () => {
    expect(
      checkRemindAt('2026-10-13T00:00:00.000Z', ddl, now).ok
    ).toBe(false);
  });

  test('格式非法拒绝', () => expect(
    checkRemindAt('abc', ddl, now).ok
  ).toBe(false));

  test('ddl 非法拒绝', () => expect(
    checkRemindAt('2026-10-19T00:00:00.000Z', null, now).ok
  ).toBe(false));
});