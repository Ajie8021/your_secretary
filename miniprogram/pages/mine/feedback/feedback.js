// pages/mine/feedback/feedback.js
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
    input: '',        // 新建反馈输入
    submitting: false,
    editingId: '',    // 正在编辑的反馈 id
    editContent: ''
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

  async refresh() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'feedback',
        data: { 
          action: 'listMine', 
          page: 1, 
          pageSize: PAGE_SIZE 
        }
      });
      const result = res.result;
      if (!result || result.code !== 0) {
        wx.showToast({ 
          title: (result && result.message) || '加载失败', 
          icon: 'none' 
        });
        return;
      }
      this.setData({ 
        list: result.data.list, 
        page: 1, 
        hasMore: result.data.hasMore 
      });
    } catch (e) {
      console.error('[feedback] refresh', e);
      wx.showToast({ 
        title: '网络异常，请重试', icon: 'none' 
      });
    }
  },

  async loadMore() {
    if (!this.data.hasMore || this.data.loading) return;
    this.setData({ loading: true });
    const next = this.data.page + 1;
    try {
      const res = await wx.cloud.callFunction({
        name: 'feedback',
        data: { 
          action: 'listMine', 
          page: next, 
          pageSize: PAGE_SIZE 
        }
      });
      const result = res.result;
      if (result && result.code === 0) {
        this.setData({
          list: this.data.list.concat(result.data.list),
          page: next,
          hasMore: result.data.hasMore
        });
      }
    } catch (e) {
      console.error('[feedback] loadMore', e);
    } finally {
      this.setData({ loading: false });
    }
  },

  onInput(e) { this.setData({ input: e.detail }); },

  /** 提交新反馈 */
  async submit() {
    if (this.data.submitting) return;
    const content = this.data.input.trim();
    if (!content) { 
      wx.showToast({ 
        title: '反馈内容不能为空', icon: 'none' 
      }); 
      return; 
    }
    this.setData({ submitting: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'feedback', 
        data: { action: 'create', content }
      });
      const result = res.result;
      if (!result || result.code !== 0) {
        wx.showToast({ 
          title: (result && result.message) || '提交失败', 
          icon: 'none' 
        });
        return;
      }
      wx.showToast({ title: '已提交', icon: 'success' });
      this.setData({ input: '' });
      this.refresh();

    } catch (e) {
      console.error('[feedback] submit', e);
      wx.showToast({ 
        title: '网络异常，提交失败', icon: 'none' 
      });
    } finally {
      this.setData({ submitting: false });
    }
  },

  /** 进入编辑：仅未回复可编辑，页面也会置灰 */
  startEdit(e) {
    const item = this.data.list.find(
      x => x.id === e.currentTarget.dataset.id
    );
    if (!item || item.replied) return;
    this.setData({ 
      editingId: item.id, 
      editContent: item.content 
    });
  },
  onEditInput(e) { 
    this.setData({ 
      editContent: e.detail 
    }); 
  },
  cancelEdit() { 
    this.setData({ 
      editingId: '', editContent: '' 
    }); 
  },

  /** 保存修改 */
  async saveEdit() {
    const content = this.data.editContent.trim();
    if (!content) { 
      wx.showToast({ 
        title: '反馈内容不能为空', icon: 'none' 
      }); 
      return; 
    }
    try {
      const res = await wx.cloud.callFunction({
        name: 'feedback',
        data: { 
          action: 'update', 
          id: this.data.editingId, 
          content 
        }
      });
      const result = res.result;
      if (!result || result.code !== 0) {
        wx.showToast({ 
          title: (result && result.message) || '保存失败', 
          icon: 'none' 
        });
        return;
      }
      wx.showToast({ title: '已保存', icon: 'success' });
      this.cancelEdit();
      this.refresh();

    } catch (e) {
      console.error('[feedback] saveEdit', e);
      wx.showToast({ 
        title: '网络异常，保存失败', icon: 'none' 
      });
    }
  }
})