// pages/note-detail/note-detail.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    note: null,
    noteId: '',         // 记住 id，供 onShow 复用
    firstShow: true
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options && options.id) {
      this.setData({ noteId: options.id });
      this.loadDetail(options.id);
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   * 每次页面显示都重新拉取详情。
   * 从编辑页 navigateBack 回来时会触发，保证内容是最新的。
   * 首次进入 onLoad + onShow 会各拉一次，可接受；
   * 若想省一次请求，可用标志位跳过首次（见下方说明）。
   */
  onShow() {
    if (this.data.firstShow) {
      this.setData({ firstShow: false });
      return;   // 首次 onShow 跳过，onLoad 已加载
    }
    if (this.data.noteId) 
      this.loadDetail(this.data.noteId);
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

  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {

  },

  /** 加载随笔详情 */
  async loadDetail(id) {
    try {
      const res = await wx.cloud.callFunction({
        name: 'note',
        data: { action: 'detail', id }
      });
      const result = res.result;
      if (!result || result.code !== 0) {
        wx.showToast({ 
          title: (result && result.message) || '加载失败', 
          icon: 'none' });
        return;
      }
      this.setData({ note: result.data.note });
    } catch (e) {
      console.error('[note-detail] load', e);
      wx.showToast({ 
        title: '网络异常，请重试', icon: 'none' 
      });
    }
  },

  /** 编辑：跳转编辑页并带上 id */
  goEdit() {
    if (!this.data.note) return;
    wx.navigateTo({ url: `/pages/note-edit/note-edit?id=${this.data.note.id}` });
  },

  /** 删除：二次确认后调用，成功后返回列表 */
  async onDelete() {
    if (!this.data.note) return;
    const confirm = await wx.showModal({ 
      title: '删除随笔', 
      content: '删除后不可恢复，确认？' ,
      confirmColor: '#70AD91'
    });
    if (!confirm.confirm) return;
    try {
      const res = await wx.cloud.callFunction({
        name: 'note',
        data: { 
          action: 'delete', id: this.data.note.id 
        }
      });
      const result = res.result;
      if (!result || result.code !== 0) {
        wx.showToast({ 
          title: (result && result.message) || '删除失败', 
          icon: 'none' 
        });
        return;
      }
      wx.showToast({ 
        title: '已删除', icon: 'success' 
      });
      setTimeout(() => wx.navigateBack(), 500);
    } catch (e) {
      console.error('[note-detail] delete', e);
      wx.showToast({ 
        title: '网络异常，请重试', icon: 'none' 
      });
    }
  },

  /** 图片预览 */
  preview(e) {
    const current = e.currentTarget.dataset.src;
    const urls = (this.data.note && this.data.note.images) || [];
    if (!current || urls.length === 0) return;
    wx.previewImage({ current, urls });
  }
})