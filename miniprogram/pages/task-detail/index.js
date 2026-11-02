// pages/task-detail/index.js

const taskApi = require('../../utils/task-api');

/**
 * 将任务时间转换为适合页面展示的格式。
 * 兼容 Date 对象、时间戳和可解析的日期字符串。
 */
function formatDateTime(value) {
  if (value === null || value === undefined || value === '') {
    return '未设置';
  }

  const date = value instanceof Date
    ? value
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '时间格式异常';
  }

  const pad = number => String(number).padStart(2, '0');

  return [
    date.getFullYear(),
    '-',
    pad(date.getMonth() + 1),
    '-',
    pad(date.getDate()),
    ' ',
    pad(date.getHours()),
    ':',
    pad(date.getMinutes())
  ].join('');
}

Page({
  data: {
    task: null,
    loading: true,
    errorMessage: ''
  },

  onLoad(options) {
    // 从列表页获取任务 ID。
    const id = options.id
      ? decodeURIComponent(options.id)
      : '';

    if (!id) {
      this.setData({
        loading: false,
        errorMessage: '缺少任务编号，无法查看详情'
      });
      return;
    }

    this.loadTaskDetail(id);
  },

  /**
   * 查询任务详情，并整理页面需要展示的数据。
   */
  async loadTaskDetail(id) {
    this.setData({
      loading: true,
      errorMessage: ''
    });

    try {
      const result = await taskApi.getTaskDetail(id);
      const task = result && result.task;

      if (!task) {
        throw new Error('未获取到任务信息');
      }

      this.setData({
        task: {
          ...task,
          displayDdl: formatDateTime(task.ddl),
          displayRemindAt: formatDateTime(task.remindAt),
          displayCreateTime: formatDateTime(task.createTime),
          displayLevel: task.level === undefined ||
            task.level === null
            ? '未设置'
            : String(task.level),
          displayType: task.type || '未分类',
          displayContent: task.content || '暂无任务描述'
        },
        loading: false
      });
    } catch (error) {
      this.setData({
        loading: false,
        errorMessage: error.message || '获取任务详情失败'
      });
    }
  },

  // 返回“我的任务”列表。
  goBack() {
    wx.navigateBack({
      delta: 1,
      fail: () => {
        // 页面栈中没有上一页时，退回任务列表。
        wx.redirectTo({
          url: '/pages/tasks/index'
        });
      }
    });
  },

  // 跳转到现有编辑页面。
  editTask() {
    const id = this.data.task && (
      this.data.task.id || this.data.task._id
    );

    if (!id) {
      wx.showToast({
        title: '任务编号缺失',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/task-form/index?id=${encodeURIComponent(id)}`
    });
  },

  /**
  * 删除当前任务：二次确认后调用云函数，成功返回列表。
  */
  onDelete() {
    const id = this.data.task && (this.data.task.id || this.data.task._id);
    if (!id) {
      wx.showToast({ title: '任务编号缺失', icon: 'none' });
      return;
    }

    wx.showModal({
      title: '删除任务',
      content: '删除后无法恢复，确定删除吗？',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await taskApi.deleteTask(id);
          wx.showToast({ title: '删除成功', icon: 'success' });
          setTimeout(() => {
            wx.navigateBack({
              delta: 1,
              fail: () => wx.redirectTo({ url: '/pages/task/index' })
            });
          }, 500);
        } catch (error) {
          wx.showToast({ title: error.message || '删除失败', icon: 'none' });
        }
      }
    });
  }
});
