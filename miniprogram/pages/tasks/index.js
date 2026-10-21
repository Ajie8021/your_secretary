const taskApi = require('../../utils/task-api');

Page({
  data: {
    tasks: [],
    page: 1,
    pageSize: 20,
    total: 0,
    loading: false,
    hasMore: true
  },

  onShow() {
    // 从编辑页返回时重新加载列表，确保状态最新。
    this.loadTasks(true);
  },

  async loadTasks(reset = false) {
    if (this.data.loading) return;
    if (!reset && !this.data.hasMore) return;

    const page = reset ? 1 : this.data.page;

    this.setData({ loading: true });

    try {
      const result = await taskApi.listTasks(
        page,
        this.data.pageSize
      );

      const newTasks = result.list || [];
      const tasks = reset
        ? newTasks
        : this.data.tasks.concat(newTasks);

      this.setData({
        tasks,
        page: page + 1,
        total: result.pagination.total,
        hasMore: tasks.length < result.pagination.total
      });
    } catch (error) {
      wx.showToast({
        title: error.message || '加载任务失败',
        icon: 'none'
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  createTask() {
    wx.navigateTo({
      url: '/pages/task-form/index'
    });
  },

  editTask(event) {
    const id = event.currentTarget.dataset.id;

    wx.navigateTo({
      url: `/pages/task-form/index?id=${encodeURIComponent(id)}`
    });
  },

  // 跳转到独立的任务详情页。
  showTaskDetail(event) {
    const id = event.currentTarget.dataset.id;

    if (!id) {
      wx.showToast({
        title: '任务编号缺失',
        icon: 'none'
      });
      return;
    }

    wx.navigateTo({
      url: `/pages/task-detail/index?id=${encodeURIComponent(id)}`
    });
  },

  showActions(event) {
    const id = event.currentTarget.dataset.id;

    wx.showActionSheet({
      itemList: [
        '编辑任务',
        '置顶任务',
        '任务完成',
        '删除任务'
      ],
      success: async (res) => {
        try {
          switch (res.tapIndex) {
            case 0:
              this.editTask({
                currentTarget: { dataset: { id } }
              });
              break;

            case 1:
              await taskApi.toggleTaskTop(id);
              wx.showToast({ title: '置顶状态已更新' });
              await this.loadTasks(true);
              break;

            case 2:
              await taskApi.toggleTaskComplete(id);
              wx.showToast({ title: '任务完成状态已更新' });
              await this.loadTasks(true);
              break;

            case 3:
              this.confirmDelete(id);
              break;
          }
        } catch (error) {
          wx.showToast({
            title: error.message || '操作失败',
            icon: 'none'
          });
        }
      }
    });
  },

  confirmDelete(id) {
    wx.showModal({
      title: '删除任务',
      content: '删除后无法恢复，确定删除吗？',
      success: async (res) => {
        if (!res.confirm) return;

        try {
          await taskApi.deleteTask(id);

          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });

          await this.loadTasks(true);
        } catch (error) {
          wx.showToast({
            title: error.message || '删除失败',
            icon: 'none'
          });
        }
      }
    });
  },

  loadMore() {
    this.loadTasks(false);
  }
});