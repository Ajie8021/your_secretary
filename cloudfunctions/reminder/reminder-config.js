
/**
 * 微信订阅消息配置。
 */

// 微信公众平台中已配置的订阅消息模板 ID。
const TEMPLATE_ID = 'Qq8ohgLuJAKZHsjjjpqZ1_Nrgp360R0MmHS_fExKrvE';

/**
 * 模板字段映射。
 *
 * 左侧字段名必须与微信模板中的字段标识一致；
 * 右侧函数从任务对象中取出对应的数据。
 */
const TEMPLATE_FIELD_MAP = {
  // 事项主题：{{thing1.DATA}}
  thing1: task => task.name,

  // 事项描述：{{thing4.DATA}}
  thing4: task => task.content,

  // 截止时间：{{time10.DATA}}
  time10: task => {
    const ddl = task.ddl;

    // 兼容 Date 对象和可解析的日期字符串。
    if (!ddl) {
      throw new Error('任务缺少截止时间 ddl');
    }

    const date = new Date(ddl);

    if (Number.isNaN(date.getTime())) {
      throw new Error('任务截止时间格式无效');
    }

    // 格式化为便于阅读的本地日期时间。
    const pad = value => String(value).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
};

// 用户点击订阅消息后打开的页面。
const MESSAGE_PAGE = 'pages/tasks/index';

module.exports = {
  TEMPLATE_ID,
  TEMPLATE_FIELD_MAP,
  MESSAGE_PAGE
};
