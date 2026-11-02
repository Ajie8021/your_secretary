const { 
  toFeedbackView, 
  normalizePaging 
} = require('../utils');

describe('toFeedbackView', () => {
  test('未回复：replied=false，repliedAt=null', () => {
    const v = toFeedbackView({ 
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
      createTime: 'T', 
      replied: false 
    });
    expect(v._openid).toBeUndefined();
  });

  test('已回复：replied=true', () => {
    const v = toFeedbackView({ 
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