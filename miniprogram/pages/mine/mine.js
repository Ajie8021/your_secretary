// pages/mine/mine.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    user: null,
    email: '714072715@qq.com', // 作者邮箱
    isAdmin: false          // 仅控制入口显示，不构成权限
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
    this.checkAdmin();
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

  /** 查询是否管理员，仅用于显示入口；真正的鉴权在云函数 */
  async checkAdmin() {
    try {
      const res = await wx.cloud.callFunction({ 
        name: 'admin', 
        data: { action: 'check' } 
      });
      const result = res.result;
      if (result && result.code === 0) {
        this.setData({ isAdmin: !!result.data.isAdmin });
      }
    } catch (e) {
      // 失败不展示入口，不影响普通使用
      console.error('[mine] checkAdmin', e);
    }
  },

  // 顶部卡片：进入编辑
  goProfile() { 
    wx.navigateTo({ 
      url: '/pages/mine/profile/profile' 
    }); 
  },
  // 基础资料 cell：进入查看
  goProfileView() {
    wx.navigateTo({ url: '/pages/mine/profile/profile?mode=view' });
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

  goAdminFeedback() {
    console.log('goAdminFeedback clicked');   // 临时日志，先确认事件是否触发
    wx.navigateTo({
      url: '/pages/admin/feedback/feedback',
      fail: (err) => {
        console.error('navigateTo fail', err);
        wx.showToast({ title: '跳转失败', icon: 'none' });
      }
    });
  },

  /** 复制邮箱 */
  copyEmail() {
    wx.setClipboardData({ data: this.data.email });
  }
})