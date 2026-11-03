// pages/mine/message/message.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    messages: [], 
    loading: false
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
    this.loadMessages();
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

  /** 拉取本人反馈，过滤出已回复的作为"消息" */
  async loadMessages() {
    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'feedback',
        data: { action: 'listMine', page: 1, pageSize: 50 }
      });

      const result = res.result;
      if (!result || result.code !== 0) {
        wx.showToast({ 
          title: (result && result.message) || '加载失败', 
          icon: 'none' 
        });
        return;
      }

      const messages = result.data.list
        .filter(x => x.replied)
        .map(x => ({
          id: x.id,
          content: x.content,
          reply: x.reply,
          repliedAt: x.repliedAt
        }));
      this.setData({ messages });

    } catch (e) {
      console.error('[message] load', e);
      wx.showToast({ 
        title: '网络异常，请重试', icon: 'none' 
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  goFeedback() { 
    wx.navigateTo({ 
      url: '/pages/mine/feedback/feedback' 
    }); 
  }
})