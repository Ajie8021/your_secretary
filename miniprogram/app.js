App({
  onLaunch() {
    // 初始化微信云开发
    if (!wx.cloud) {
      console.error('当前基础库不支持云开发');
      return;
    }

    wx.cloud.init({
      // 使用当前小程序关联的云开发环境
      // 正式部署时建议填写具体的云环境 ID
      env: 'cloud1-d5gwgyva8b09b93ff',
      traceUser: true
    });
  },

  globalData: {
    // 当前登录用户资料
    userInfo: null,
    // 是否已完成登录初始化
    loggedIn: false
  }
});