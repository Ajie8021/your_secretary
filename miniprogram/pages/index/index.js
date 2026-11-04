const app = getApp();

Page({
  data: {
    loading: false,
    userInfo: null,
    errorMessage: ''
  },

  onLoad() {
    this.onLogin();
  },

  /**
   * 调用 login 云函数，完成用户初始化。
   */
  async onLogin() {
    if (this.data.loading) {
      return;
    }

    this.setData({
      loading: true,
      errorMessage: ''
    });

    try {
      const result = await wx.cloud.callFunction({
        name: 'login',
        data: {}
      });

      const response = result.result;

      if (!response || response.code !== 0) {
        throw new Error(
          response && response.message
            ? response.message
            : '登录初始化失败'
        );
      }

      const user = response.data.user;

      // 保存到小程序全局状态，供后续页面复用
      app.globalData.userInfo = user;
      app.globalData.loggedIn = true;

      this.setData({
        userInfo: user,
        errorMessage: ''
      });

      wx.switchTab({ url: '/pages/tasks/index' });
    } catch (error) {
      console.error('登录调用失败：', error);

      const message = error && error.message
        ? error.message
        : '网络异常，请稍后重试';

      this.setData({
        errorMessage: message
      });

      wx.showToast({
        title: '初始化失败',
        icon: 'none'
      });
    } finally {
      this.setData({
        loading: false
      });
    }
  },
});