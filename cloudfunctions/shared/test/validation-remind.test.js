/**
 * 任务模块：提醒时间与四象限等级相关校验的单元测试
 *
 * 被测对象：cloudfunctions/task/validation.js 的实际导出
 *   - parseDate(value, fieldName)
 *   - validateCreateTask(input)
 *   - validateUpdateTask(input)
 *
 * 说明：
 *   - 设计文档要求“提醒时间不得晚于 ddl”“已过期提醒应要求重新选择或关闭”。
 *   - 当前 validation.js 实现了“不得晚于 ddl”，未实现“不得早于 now”的过期判断；
 *     因此过期规则不在此文件断言为“拒绝”，而是作为已知差距在文末 TODO 中标注，
 *     避免测试与实际实现不一致造成假通过/假失败。
 */

const {
  parseDate,
  validateCreateTask,
  validateUpdateTask
} = require('../../task/validation');

describe('parseDate', () => {
  test('空值统一返回 null 且无错误', () => {
    expect(parseDate(undefined, 'ddl')).toEqual({ 
      value: null, error: null 
    });
    expect(parseDate(null, 'ddl')).toEqual({ 
      value: null, error: null 
    });
    expect(parseDate('', 'ddl')).toEqual({ 
      value: null, error: null 
    });
  });

  test('合法 ISO 字符串解析为 Date', () => {
    const r = parseDate('2026-10-20T15:59:00.000Z', 'ddl');
    expect(r.error).toBeNull();
    expect(r.value instanceof Date).toBe(true);
    expect(r.value.getTime()).toBe(
      Date.UTC(2026, 9, 20, 15, 59, 0)
    );
  });

  test('Date 实例原样返回', () => {
    const d = new Date('2026-10-20T00:00:00.000Z');
    const r = parseDate(d, 'ddl');
    expect(r.error).toBeNull();
    expect(r.value.getTime()).toBe(d.getTime());
  });

  test('非法字符串返回字段名相关的错误', () => {
    const r = parseDate('abc', '截止时间');
    expect(r.value).toBeNull();
    expect(r.error).toContain('截止时间');
  });
});

describe('validateCreateTask：提醒时间不得晚于 ddl', () => {
  const base = {
    type: '课程',
    level: 3,
    content: '完成作业',
    images: []
  };

  test('未设置提醒：合法', () => {
    const r = validateCreateTask({
      ...base,
      ddl: '2026-10-20T00:00:00.000Z',
      remindAt: null
    });
    expect(r.valid).toBe(true);
    expect(r.data.remindAt).toBeNull();
  });

  test('提醒早于 ddl：合法', () => {
    const r = validateCreateTask({
      ...base,
      ddl: '2026-10-20T00:00:00.000Z',
      remindAt: '2026-10-19T00:00:00.000Z'
    });
    expect(r.valid).toBe(true);
    expect(r.data.remindAt instanceof Date).toBe(true);
  });

  test('提醒等于 ddl：合法（不晚于）', () => {
    const r = validateCreateTask({
      ...base,
      ddl: '2026-10-20T00:00:00.000Z',
      remindAt: '2026-10-20T00:00:00.000Z'
    });
    expect(r.valid).toBe(true);
  });

  test('提醒晚于 ddl：拒绝', () => {
    const r = validateCreateTask({
      ...base,
      ddl: '2026-10-20T00:00:00.000Z',
      remindAt: '2026-10-20T00:00:01.000Z'
    });
    expect(r.valid).toBe(false);
    expect(r.errors.join(''))
      .toContain('提醒时间不能晚于截止时间');
  });

  test('ddl 非法时，不因 remindAt 比较产生二次噪声（仅报 ddl 错误）', () => {
    const r = validateCreateTask({
      ...base,
      ddl: 'not-a-date',
      remindAt: '2026-10-20T00:00:00.000Z'
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('截止时间'))).toBe(true);
  });

  test('remindAt 非法时返回错误', () => {
    const r = validateCreateTask({
      ...base,
      ddl: '2026-10-20T00:00:00.000Z',
      remindAt: 'abc'
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('提醒时间'))).toBe(true);
  });
});

describe('validateCreateTask：level 与必填', () => {
  const base = {
    type: '课程',
    ddl: '2026-10-20T00:00:00.000Z',
    content: '完成作业',
    images: []
  };

  test('level 1–4 合法', () => {
    [1, 2, 3, 4].forEach(level => {
      const r = validateCreateTask({ ...base, level });
      expect(r.valid).toBe(true);
    });
  });

  test('level 越界/非整数拒绝', () => {
    [0, 5, -1, 1.5, '2'].forEach(level => {
      const r = validateCreateTask({ ...base, level });
      expect(r.valid).toBe(false);
      expect(r.errors.join('')).toContain('任务等级');
    });
  });

  test('level 未传默认 1', () => {
    const r = validateCreateTask({ ...base });
    expect(r.valid).toBe(true);
    expect(r.data.level).toBe(1);
  });

  test('name 空 → 无名；type 保留；images 未传 → []', () => {
    const r = validateCreateTask({
      type: '课程',
      level: 2,
      ddl: '2026-10-20T00:00:00.000Z',
      content: 'x'
    });
    expect(r.valid).toBe(true);
    expect(r.data.name).toBe('无名');
    expect(r.data.images).toEqual([]);
  });
});

describe('validateUpdateTask：只校验提交字段且整体比较时间', () => {
  test('未提交任何允许字段：拒绝', () => {
    const r = validateUpdateTask({ id: 't1' });
    expect(r.valid).toBe(false);
    expect(r.errors.join('')).toContain('至少需要提供一个可修改的字段');
  });

  test('只提交 remindAt：解析为 Date（不填默认值）', () => {
    const r = validateUpdateTask({ 
      remindAt: '2026-10-19T00:00:00.000Z' 
    });
    expect(r.valid).toBe(true);
    expect(r.data.remindAt instanceof Date).toBe(true);
    // 未提交的字段不应出现在 data 中
    expect('name' in r.data).toBe(false);
    expect('level' in r.data).toBe(false);
  });

  test('提交 remindAt=null：允许清空提醒', () => {
    const r = validateUpdateTask({ remindAt: null });
    expect(r.valid).toBe(true);
    expect(r.data.remindAt).toBeNull();
  });

  test('level 越界拒绝', () => {
    const r = validateUpdateTask({ level: 9 });
    expect(r.valid).toBe(false);
  });
});

/**
 * 已知差距（TODO，不计入本文件断言，避免与实现不符）：
 * 1. 设计文档要求“已过去的提醒时间应要求用户重新选择或关闭提醒”。
 *    当前 validateCreateTask / validateUpdateTask 未做“remindAt > now”的过期校验，
 *    该规则目前只能由前端拦截或后续在 validation.js 中补充。
 * 2. 若后续在 validation.js 增加并导出 checkRemindAt / toValidDate，
 *    可在此文件新增 describe 块覆盖，而无需改动其他测试。
 */