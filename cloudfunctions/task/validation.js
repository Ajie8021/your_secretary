
/**
 * 任务创建参数校验与标准化。
 * 此文件不依赖微信云开发环境，可以单独进行单元测试。
 */

function parseDate(value, fieldName) {
  // 未设置日期时，统一按 null 处理
  if (value === undefined || value === null || value === '') {
    return { value: null, error: null };
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return {
      value: null,
      error: `${fieldName}必须是有效的日期时间`
    };
  }

  return { value: date, error: null };
}

function validateCreateTask(input) {
  const errors = [];

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      valid: false,
      errors: ['任务参数必须是对象']
    };
  }

  // 任务名称：去除首尾空格，未填写时使用默认名称
  let name = '无名';

  if (input.name !== undefined && input.name !== null) {
    if (typeof input.name !== 'string') {
      errors.push('任务名称必须是字符串');
    } else {
      name = input.name.trim() || '无名';
    }
  }

  // 任务类型
  let type = '';

  if (input.type !== undefined && input.type !== null) {
    if (typeof input.type !== 'string') {
      errors.push('任务类型必须是字符串');
    } else {
      type = input.type.trim();
    }
  }

  // 任务等级：1 到 4，未传时默认 1
  const level = input.level === undefined ? 1 : input.level;

  if (!Number.isInteger(level) || level < 1 || level > 4) {
    errors.push('任务等级必须是 1 到 4 的整数');
  }

  // 任务描述
  let content = '';

  if (input.content !== undefined && input.content !== null) {
    if (typeof input.content !== 'string') {
      errors.push('任务描述必须是字符串');
    } else {
      content = input.content;
    }
  }

  // 图片列表
  const images = input.images === undefined ? [] : input.images;

  if (
    !Array.isArray(images) ||
    !images.every(item => typeof item === 'string')
  ) {
    errors.push('图片列表必须是字符串数组');
  }

  // 截止时间与提醒时间
  const ddlResult = parseDate(input.ddl, '截止时间');
  const remindResult = parseDate(input.remindAt, '提醒时间');

  if (ddlResult.error) errors.push(ddlResult.error);
  if (remindResult.error) errors.push(remindResult.error);

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    data: {
      name,
      type,
      level,
      ddl: ddlResult.value,
      content,
      images,
      remindAt: remindResult.value
    }
  };
}

/**
 * 解析并校验分页参数。
 * 默认第 1 页，每页 20 条，最大每页 100 条。
 */
function parsePagination(input = {}) {
  const page = input.page === undefined ? 1 : input.page;
  const pageSize = input.pageSize === undefined
    ? 20
    : input.pageSize;

  const errors = [];

  if (!Number.isInteger(page) || page < 1) {
    errors.push('页码 page 必须是大于等于 1 的整数');
  }

  if (
    !Number.isInteger(pageSize) ||
    pageSize < 1 ||
    pageSize > 100
  ) {
    errors.push('每页条数 pageSize 必须是 1 到 100 的整数');
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors
    };
  }

  return {
    valid: true,
    errors: [],
    data: {
      page,
      pageSize,
      skip: (page - 1) * pageSize
    }
  };
}

/**
 * 校验修改任务的参数。
 *
 * 只校验用户实际提交的字段，不给缺失字段填默认值，
 * 从而避免修改任务时覆盖原有数据。
 */
function validateUpdateTask(input) {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    return {
      valid: false,
      errors: ['修改参数必须是对象']
    };
  }

  const data = {};
  const errors = [];
  const allowedFields = [
    'name',
    'type',
    'level',
    'ddl',
    'content',
    'images',
    'remindAt'
  ];

  // 至少要提交一个允许修改的字段。
  const fields = allowedFields.filter(
    field => Object.prototype.hasOwnProperty.call(input, field)
  );

  if (fields.length === 0) {
    return {
      valid: false,
      errors: ['至少需要提供一个可修改的字段']
    };
  }

  if (Object.prototype.hasOwnProperty.call(input, 'name')) {
    if (typeof input.name !== 'string') {
      errors.push('任务名称必须是字符串');
    } else {
      data.name = input.name.trim() || '无名';
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, 'type')) {
    if (typeof input.type !== 'string') {
      errors.push('任务类型必须是字符串');
    } else {
      data.type = input.type.trim();
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, 'level')) {
    if (
      !Number.isInteger(input.level) ||
      input.level < 1 ||
      input.level > 4
    ) {
      errors.push('任务等级必须是 1 到 4 的整数');
    } else {
      data.level = input.level;
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, 'ddl')) {
    const result = parseDate(input.ddl, '截止时间');

    if (result.error) {
      errors.push(result.error);
    } else {
      data.ddl = result.value;
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, 'remindAt')) {
    const result = parseDate(input.remindAt, '提醒时间');

    if (result.error) {
      errors.push(result.error);
    } else {
      data.remindAt = result.value;
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, 'content')) {
    if (typeof input.content !== 'string') {
      errors.push('任务描述必须是字符串');
    } else {
      data.content = input.content;
    }
  }

  if (Object.prototype.hasOwnProperty.call(input, 'images')) {
    if (
      !Array.isArray(input.images) ||
      !input.images.every(item => typeof item === 'string')
    ) {
      errors.push('图片列表必须是字符串数组');
    } else {
      data.images = input.images;
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors
    };
  }

  return {
    valid: true,
    errors: [],
    data
  };
}


module.exports = {
  parseDate,
  validateCreateTask,
  parsePagination,
  validateUpdateTask
};
