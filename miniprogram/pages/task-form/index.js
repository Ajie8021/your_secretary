const taskApi = require('../../utils/task-api');

function pad2(value) {
  return String(value).padStart(2, '0');
}

/**
 * 将 ISO 日期转换成日期选择器使用的 YYYY-MM-DD。
 * 使用本地时间，避免日期因时区转换而偏移一天。
 */
function toDateValue(value) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate())
  ].join('-');
}

/**
 * 将 ISO 日期转换成时间选择器使用的 HH:mm。
 */
function toTimeValue(value, fallback) {
  if (!value) return fallback;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return fallback;

  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/**
 * 将日期和时间选择器的值转换为 ISO 日期字符串。
 * 日期为空时返回 null，表示清除该时间。
 */
function buildDateTime(dateValue, timeValue) {
  if (!dateValue) return null;

  if (!timeValue) {
    throw new Error('请选择完整的日期和时间');
  }

  const date = new Date(`${dateValue}T${timeValue}:00`);

  if (Number.isNaN(date.getTime())) {
    throw new Error('日期或时间格式不正确');
  }

  return date.toISOString();
}

Page({
  data: {
    id: '',
    isEdit: false,
    name: '',
    type: '',
    level: 1,
    content: '',
    ddlDate: '',
    ddlTime: '23:59',
    remindDate: '',
    remindTime: '09:00',
    saving: false
  },

  onLoad(options) {
    if (options.id) {
      this.setData({
        id: options.id,
        isEdit: true
      });

      wx.setNavigationBarTitle({
        title: '编辑任务'
      });

      this.loadTask(options.id);
    } else {
      wx.setNavigationBarTitle({
        title: '新建任务'
      });
    }
  },

  async loadTask(id) {
    wx.showLoading({ title: '加载中' });

    try {
      const result = await taskApi.getTaskDetail(id);
      const task = result.task;

      this.setData({
        name: task.name || '',
        type: task.type || '',
        level: task.level || 1,
        content: task.content || '',
        ddlDate: toDateValue(task.ddl),
        ddlTime: toTimeValue(task.ddl, '23:59'),
        remindDate: toDateValue(task.remindAt),
        remindTime: toTimeValue(task.remindAt, '09:00')
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '加载任务失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },

  onNameInput(event) {
    this.setData({ name: event.detail.value });
  },

  onTypeInput(event) {
    this.setData({ type: event.detail.value });
  },

  onContentInput(event) {
    this.setData({ content: event.detail.value });
  },

  onLevelChange(event) {
    this.setData({
      level: Number(event.detail.value)
    });
  },

  onDdlDateChange(event) {
    this.setData({ ddlDate: event.detail.value });
  },

  onDdlTimeChange(event) {
    this.setData({ ddlTime: event.detail.value });
  },

  onRemindDateChange(event) {
    this.setData({ remindDate: event.detail.value });
  },

  onRemindTimeChange(event) {
    this.setData({ remindTime: event.detail.value });
  },

  clearDdl() {
    this.setData({ ddlDate: '' });
  },

  clearReminder() {
    this.setData({ remindDate: '' });
  },

  async submitTask() {
    if (this.data.saving) return;

    // 任务名称允许为空；为空时使用默认名称
    const name = (this.data.name || '').trim() || '无名';

    this.setData({ saving: true });

    try {
      const ddl = buildDateTime(
        this.data.ddlDate,
        this.data.ddlTime
      );

      const remindAt = buildDateTime(
        this.data.remindDate,
        this.data.remindTime
      );

      // 校验：提醒时间不能晚于截止时间。
      // 只有两个时间都设置时，才进行比较。
      if (ddl && remindAt) {
        const ddlTimestamp = new Date(ddl).getTime();
        const remindTimestamp = new Date(remindAt).getTime();

        if (remindTimestamp > ddlTimestamp) {
          wx.showToast({
            title: '提醒时间不能晚于截止时间',
            icon: 'none'
          });
          return;
        }
      }

      const taskData = {
        name,
        type: this.data.type.trim(),
        level: this.data.level,
        content: this.data.content,
        ddl,
        remindAt
      };

      if (this.data.isEdit) {
        await taskApi.updateTask(this.data.id, taskData);
      } else {
        await taskApi.createTask(taskData);
      }

      wx.showToast({
        title: this.data.isEdit ? '修改成功' : '创建成功',
        icon: 'success'
      });

      // 等待提示显示后返回任务列表。
      setTimeout(() => {
        wx.navigateBack();
      }, 500);
    } catch (error) {
      wx.showToast({
        title: error.message || '保存失败',
        icon: 'none'
      });
    } finally {
      this.setData({ saving: false });
    }
  }
});