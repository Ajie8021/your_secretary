const taskApi = require('../../utils/task-api');

const SWIPE_THRESHOLD = 60;   // 达到该水平位移(px)松手才切换完成
const SWIPE_MAX = 120;        // 最大可拖动距离(px)
const TAP_MOVE_LIMIT = 8;     // 位移小于该值视为点击
const LONG_PRESS_MS = 500;    // 触摸时长超过此值视为长按，不再触发点击

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
    this.loadTasks(true);
  },

  async loadTasks(reset = false) {
    if (this.data.loading) return;
    if (!reset && !this.data.hasMore) return;

    const page = reset ? 1 : this.data.page;
    this.setData({ loading: true });

    try {
      const result = await taskApi.listTasks(page, this.data.pageSize);
      // 每条补 _swipeX，transform 才能绑定到数值
      const newTasks = (result.list || []).map(t => ({ ...t, _swipeX: 0 }));
      const tasks = reset ? newTasks : this.data.tasks.concat(newTasks);

      this.setData({
        tasks,
        page: page + 1,
        total: result.pagination.total,
        hasMore: tasks.length < result.pagination.total
      });
    } catch (error) {
      wx.showToast({ title: error.message || '加载任务失败', icon: 'none' });
    } finally {
      this.setData({ loading: false });
    }
  },

  createTask() {
    wx.navigateTo({ url: '/pages/task-form/index' });
  },

  /** 触摸开始：记录起点、索引与开始时间 */
  onTouchStart(e) {
    const index = e.currentTarget.dataset.index;
    const t = e.touches[0];
    this._touch = {
      index,
      startX: t.clientX,
      startY: t.clientY,
      startTime: Date.now(),  // 用于区分长按与点击
      moved: false
    };
  },

  /** 触摸移动：仅处理水平方向，纵向放行给页面滚动 */
  onTouchMove(e) {
    if (!this._touch) return;
    const t = e.touches[0];
    const dx = t.clientX - this._touch.startX;
    const dy = t.clientY - this._touch.startY;

    // 纵向位移更大 → 视为滚动，不拦截
    if (Math.abs(dy) > Math.abs(dx)) return;

    const index = this._touch.index;
    const x = Math.max(0, Math.min(dx, SWIPE_MAX));
    if (x > TAP_MOVE_LIMIT) this._touch.moved = true;

    this.setData({ [`tasks[${index}]._swipeX`]: x });
  },

  /**
   * 触摸结束：
   * - 长按（时长 >= LONG_PRESS_MS）→ 已由 onLongPress 处理，这里直接返回
   * - 未滑动且位移小 → 点击，进详情
   * - 滑动达阈值 → 切换完成
   * - 其余 → 仅回弹
   */
  async onTouchEnd(e) {
    if (!this._touch) return;
    const { index, moved, startTime } = this._touch;
    const duration = Date.now() - startTime;
    this._touch = null;

    const item = this.data.tasks[index];
    if (!item) return;

    const x = item._swipeX || 0;
    // 回弹
    this.setData({ [`tasks[${index}]._swipeX`]: 0 });

    // 长按松手：置顶已触发，不再进入详情
    if (duration >= LONG_PRESS_MS) return;

    // 点击：未发生明显滑动
    if (!moved && Math.abs(x) < TAP_MOVE_LIMIT) {
      this.showTaskDetail({ currentTarget: { dataset: { id: item.id } } });
      return;
    }

    // 滑动未达阈值：只回弹
    if (x < SWIPE_THRESHOLD) return;

    // 达到阈值：切换完成
    try {
      await taskApi.toggleTaskComplete(item.id);
      wx.showToast({
        title: item.completed ? '已恢复为未完成' : '任务已完成',
        icon: 'none'
      });
      await this.loadTasks(true);
    } catch (error) {
      wx.showToast({ title: error.message || '操作失败', icon: 'none' });
    }
  },

  showTaskDetail(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) {
      wx.showToast({ title: '任务编号缺失', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `/pages/task-detail/index?id=${encodeURIComponent(id)}` });
  },

  /** 长按：切换置顶 */
  async onLongPress(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    try {
      await taskApi.toggleTaskTop(id);
      wx.showToast({ title: '置顶状态已更新', icon: 'none' });
      await this.loadTasks(true);
    } catch (error) {
      wx.showToast({ title: error.message || '操作失败', icon: 'none' });
    }
  },

  loadMore() {
    this.loadTasks(false);
  }
});