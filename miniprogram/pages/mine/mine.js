// pages/mine/mine.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    user: null,
    email: '714072715@qq.com' // 作者邮箱，按实际替换
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
    this.loadProfile();
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

  /** 读取资料；失败只提示，不阻塞入口展示 */
  async loadProfile() {
    try {
      const res = await wx.cloud.callFunction({ 
        name: 'user', 
        data: { action: 'getProfile' } 
      });

      const result = res.result;
      if (result && result.code === 0) 
        this.setData({ user: result.data.user });

    } catch (e) {
      console.error('[mine] loadProfile', e);
    }
  },

  goProfile() { 
    wx.navigateTo({ 
      url: '/pages/mine/profile/profile' 
    }); 
  },
  goFeedback() { 
    wx.navigateTo({ 
      url: '/pages/mine/feedback/feedback' 
    }); 
  },
  goMessage() { 
    wx.navigateTo({ 
      url: '/pages/mine/message/message' 
    }); 
  },

  /** 复制邮箱 */
  copyEmail() {
    wx.setClipboardData({ data: this.data.email });
  }
})