Page({
  data: {
    loading: false,
    userInfo: null,
    errorMessage: ''
  },

  onLoad() {
    this.login();
  },

  /**
   * 调用 login 云函数，完成用户初始化。
   */
  async login() {
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
      const app = getApp();
      app.globalData.userInfo = user;
      app.globalData.loggedIn = true;

      this.setData({
        userInfo: user,
        errorMessage: ''
      });
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

  // /**
  //  * 调用testCreateTask云函数，完成任务创建测试。
  //  */
  // async testCreateTask() {
  //   wx.showLoading({
  //     title: '正在创建'
  //   });

  //   try {
  //     const result = await wx.cloud.callFunction({
  //       name: 'task',
  //       data: {
  //         action: 'create',
  //         data: {
  //           name: '测试任务',
  //           type: '学习',
  //           level: 4,
  //           ddl: '2026-10-20T12:00:00.000Z',
  //           content: '用于验证任务创建功能',
  //           images: []
  //         }
  //       }
  //     });

  //     const res = result.result;
  //     console.log('创建任务返回结果：', res);

  //     if (res.code === 0) {
  //       wx.showToast({
  //         title: '创建成功',
  //         icon: 'success'
  //       });
  //     } else {
  //       wx.showToast({
  //         title: res.message || '创建失败',
  //         icon: 'none'
  //       });
  //     }
  //   } catch (error) {
  //     console.error('创建任务调用失败：', error);

  //     wx.showToast({
  //       title: '调用失败，请查看控制台',
  //       icon: 'none'
  //     });
  //   } finally {
  //     wx.hideLoading();
  //   }
  // }

  //  /**
  //  * 调用testListTasks云函数进行任务列表测试。
  //  */
  //  async testListTasks() {
  //   const result = await wx.cloud.callFunction({
  //     name: 'task',
  //     data: {
  //       action: 'list',
  //       page: 1,
  //       pageSize: 20
  //     }
  //   });
    
  //   console.log('任务列表：', result.result);
  // }

  //  /**
  //  * 调用testDetailTask云函数进行任务详情测试。
  //  */
  // async testDetailTask() {
  //   const result = await wx.cloud.callFunction({
  //     name: 'task',
  //     data: {
  //       action: 'detail',
  //       id: '1a3ef1dd6ad03daa021bcfe93ca9ed49'
  //     }
  //   });
    
  //   console.log('任务详情：', result.result);
  // }

  //  /**
  //  * 调用testUpdateTask云函数进行任务修改测试。
  //  */
  // async testUpdateTask() {
  //   const result = await wx.cloud.callFunction({
  //     name: 'task',
  //     data: {
  //       action: 'update',
  //       id: '1a3ef1dd6ad03daa021bcfe93ca9ed49',
  //       data: {
  //         name: '修改测试',
  //         level: 3
  //       }
  //     }
  //   });
    
  //   console.log('修改结果：', result.result);
  // }

  // /**
  //  * 调用testTopTask云函数进行任务置顶测试。
  //  */
  // async testTopTask() {
  //   const result = await wx.cloud.callFunction({
  //     name: 'task',
  //     data: {
  //       action: 'toggleTop',
  //       id: '1a3ef1dd6ad03daa021bcfe93ca9ed49'
  //     }
  //   });
    
  //   console.log('置顶结果：', result.result);
  // }

  // /**
  //  * 调用testCompleteTask云函数进行任务完成状态切换测试。
  //  */
  // async testCompleteTask() {
  //   const result = await wx.cloud.callFunction({
  //     name: 'task',
  //     data: {
  //       action: 'toggleComplete',
  //       id: '1a3ef1dd6ad03daa021bcfe93ca9ed49'
  //     }
  //   });
    
  //   console.log('完成状态：', result.result);
  // }

  // /**
  //  * 调用testDeleteTask云函数进行任务删除测试。
  //  */
  // async testDeleteTask() {
  //   const result = await wx.cloud.callFunction({
  //     name: 'task',
  //     data: {
  //       action: 'delete',
  //       id: '1a3ef1dd6ad03daa021bcfe93ca9ed49'
  //     }
  //   });
    
  //   console.log('删除结果：', result.result);
  // }

  goToTasks() {
    wx.navigateTo({
      url: '/pages/tasks/index'
    });
  }
});