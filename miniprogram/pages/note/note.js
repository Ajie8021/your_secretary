// pages/note/note.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    list: [],
    page: 1,
    hasMore: true,
    loading: false,
    refreshing: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 从编辑/详情返回时刷新，保证置顶、删除、编辑结果可见
    this.refresh();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.refresh().finally(() => wx.stopPullDownRefresh());
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    this.loadMore();
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  /** 首次/刷新：重置到第 1 页 */
  async refresh() {
    if (this.data.refreshing) return;
    this.setData({ refreshing: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'note',
        data: { action: 'list', page: 1, pageSize: PAGE_SIZE }
      });
      const result = res.result;
      if (!result || result.code !== 0) {
        wx.showToast({ title: (result && result.message) || '加载失败', icon: 'none' });
        return;
      }
      const { list, hasMore } = result.data;
      this.setData({ list, page: 1, hasMore });
    } catch (e) {
      console.error('[note] refresh', e);
      wx.showToast({ title: '网络异常，请重试', icon: 'none' });
    } finally {
      this.setData({ refreshing: false });
    }
  },

  /** 上拉加载下一页 */
  async loadMore() {
    if (!this.data.hasMore || this.data.loading) return;

    this.setData({ loading: true });
    const nextPage = this.data.page + 1;

    try {
      const res = await wx.cloud.callFunction({
        name: 'note',
        data: { 
          action: 'list', 
          page: nextPage, 
          pageSize: PAGE_SIZE 
        }
      });

      const result = res.result;
      if (!result || result.code !== 0) {
        wx.showToast({ 
          title: (result && result.message) || '加载失败', 
          icon: 'none' });
        return;
      }

      this.setData({
        list: this.data.list.concat(result.data.list),
        page: nextPage,
        hasMore: result.data.hasMore
      });

    } catch (e) {
      console.error('[note] loadMore', e);
      wx.showToast({ 
        title: '网络异常，请重试', 
        icon: 'none' 
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /** 长按置顶/取消置顶 */
  async onLongPress(e) {
    const id = e.currentTarget.dataset.id;
    try {
      const res = await wx.cloud.callFunction({
        name: 'note',
        data: { action: 'toggleTop', id }
      });

      const result = res.result;
      if (!result || result.code !== 0) {
        wx.showToast({ 
          title: (result && result.message) || '操作失败',
          icon: 'none' 
        });
        return;
      }

      wx.showToast({ 
        title: result.data.top ? '已置顶' : '已取消置顶', 
        icon: 'none' 
      });
      this.refresh();

    } catch (err) {
      console.error('[note] toggleTop', err);
      wx.showToast({ 
        title: '网络异常，请重试', icon: 'none' 
      });
    }
  },

  /** 点击进入详情 */
  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ 
      url: `/pages/note-detail/note-detail?id=${id}` 
    });
  },

  /** 新建 */
  goCreate() {
    wx.navigateTo({ url: '/pages/note-edit/note-edit' });
  }
})