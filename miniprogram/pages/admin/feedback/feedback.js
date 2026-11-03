// pages/admin/feedback/feedback.js

const PAGE_SIZE = 20;

Page({

  /**
   * 页面的初始数据
   */
  data: {
    list: [],
    page: 1,
    hasMore: true,
    loading: false,
    authorized: true,      // false 时展示无权限
    replyingId: '',        // 正在回复的反馈 id
    replyInput: '',
    submitting: false
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

  /**
   * 加载列表；403 时置 authorized=false 并展示无权限
   * @param {number} page
   * @param {boolean} append 是否追加
   */
  async fetchList(page, append) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'admin',
        data: { 
          action: 'listFeedbacks', 
          page, 
          pageSize: PAGE_SIZE 
        }
      });

      const result = res.result;
      if (!result) {
        wx.showToast({ title: '加载失败', icon: 'none' });
        return;
      }
      if (result.code === 403) {
        this.setData({ authorized: false, list: [] });
        return;
      }
      if (result.code !== 0) {
        wx.showToast({ 
          title: result.message || '加载失败', 
          icon: 'none' 
        });
        return;
      }
      
      const list = append ? this.data.list.concat(result.data.list) : result.data.list;
      this.setData({
        list,
        page,
        hasMore: result.data.hasMore,
        authorized: true
      });
    } catch (e) {
      console.error('[admin-feedback] fetch', e);
      wx.showToast({ 
        title: '网络异常，请重试', icon: 'none' 
      });
    }
  },

  async refresh() {
    await this.fetchList(1, false);
  },

  async loadMore() {
    if (!this.data.hasMore || this.data.loading) return;
    this.setData({ loading: true });
    try {
      await this.fetchList(this.data.page + 1, true);
    } finally {
      this.setData({ loading: false });
    }
  },

  /** 进入回复态；已回复项不响应 */
  startReply(e) {
    const item = this.data.list.find(
      x => x.id === e.currentTarget.dataset.id
    );
    if (!item || item.replied) return;
    this.setData({ replyingId: item.id, replyInput: '' });
  },
  onReplyInput(e) { 
    this.setData({ 
      replyInput: e.detail 
    }); 
  },
  cancelReply() { 
    this.setData({ 
      replyingId: '', replyInput: '' 
    }); 
  },

  /** 提交回复 */
  async submitReply() {
    if (this.data.submitting) return;

    const reply = this.data.replyInput.trim();
    if (!reply) {
      wx.showToast({ 
        title: '回复内容不能为空', icon: 'none' 
      });
      return;
    }
    this.setData({ submitting: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'admin',
        data: { 
          action: 'replyFeedback', 
          id: this.data.replyingId, 
          reply 
        }
      });

      const result = res.result;
      if (!result || result.code !== 0) {
        wx.showToast({ 
          title: (result && result.message) || '回复失败', 
          icon: 'none' 
        });
        return;
      }

      wx.showToast({ title: '已回复', icon: 'success' });
      this.cancelReply();
      this.refresh();

    } catch (e) {
      console.error('[admin-feedback] reply', e);
      wx.showToast({ 
        title: '网络异常，回复失败', icon: 'none' 
      });
    } finally {
      this.setData({ submitting: false });
    }
  }
})