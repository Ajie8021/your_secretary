const { 
  toAdminFeedbackView, 
  normalizePaging, 
  normalizeReply 
} = require('../utils');

describe('toAdminFeedbackView', () => {
  test('未回复 replied=false', () => {
    const v = toAdminFeedbackView({ 
      _id: 'f1', 
      content: 'c', 
      reply: '', 
      repliedAt: null, 
      createTime: 'T' 
    });
    expect(v).toEqual({ 
      id: 'f1', 
      content: 'c', 
      reply: '', 
      repliedAt: null, 
      replied: false, 
      createTime: 'T' 
    });
  });

  test('已回复 replied=true', () => {
    const v = toAdminFeedbackView({ 
      _id: 'f1', 
      content: 'c', 
      reply: 'r', 
      repliedAt: 'T2', 
      createTime: 'T' 
    });
    expect(v.replied).toBe(true);
  });
});

describe('normalizePaging', () => {
  test('默认值与上限', () => {
    expect(normalizePaging()).toEqual({ 
      page: 1, pageSize: 20 
    });
    expect(normalizePaging(0, 999)).toEqual({ 
      page: 1, pageSize: 100 
    });
  });
});

describe('normalizeReply', () => {
  test('合法文本返回 trim 结果', () => {
    expect(normalizeReply('  感谢反馈  ')).toBe('感谢反馈');
  });
  
  test('空串/非字符串返回 null', () => {
    expect(normalizeReply('')).toBeNull();
    expect(normalizeReply('   ')).toBeNull();
    expect(normalizeReply(123)).toBeNull();
    expect(normalizeReply(undefined)).toBeNull();
  });
});