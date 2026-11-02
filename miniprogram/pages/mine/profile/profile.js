// pages/mine/profile/profile.js
const GENDERS = ['男', '女', '保密'];

Page({

  /**
   * 页面的初始数据
   */
  data: {
    isView: false,   // true = 只读查看
    form: { 
      avatar: '', 
      nickname: '', 
      gender: '保密', 
      birthday: '', 
      address: '', 
      job: '' 
    },
    genders: GENDERS,
    showGender: false,
    saving: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const isView = options && options.mode === 'view';
    this.setData({ isView });

    // 只读模式设置导航标题
    wx.setNavigationBarTitle({ 
      title: isView ? '基础资料' : '编辑资料' 
    });
    this.loadProfile();
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

  async loadProfile() {
    try {
      const res = await wx.cloud.callFunction({ 
        name: 'user', 
        data: { action: 'getProfile' } 
      });

      const result = res.result;
      if (!result || result.code !== 0) {
        wx.showToast({ 
          title: (result && result.message) || '加载失败', 
          icon: 'none' 
        });
        return;
      }

      const { 
        avatar, nickname, gender, 
        birthday, address, job 
      } = result.data.user;
      this.setData({ 
        form: { 
          avatar, nickname, gender, 
          birthday, address, job 
        } 
      });
    } catch (e) {
      console.error('[profile] load', e);
      wx.showToast({ 
        title: '网络异常，请重试', icon: 'none' 
      });
    }
  },

  // 只读模式下这些交互直接返回
  onFieldChange(e) {
    if (this.data.isView) return;
    const key = e.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: e.detail });
  },

  /** 选择并上传头像，成功才写入 form.avatar */
  async chooseAvatar() {
    if (this.data.isView) return;

    let chosen;
    try {
      chosen = await wx.chooseMedia({ 
        count: 1, 
        mediaType: ['image'], 
        sizeType: ['compressed'] 
      });
    } catch (e) { return; }
    const file = chosen.tempFiles[0];
    wx.showLoading({ title: '上传中' });

    try {
      const ext = (
        file.tempFilePath.match(/\.[a-zA-Z0-9]+$/) || ['.jpg']
      )[0];
      const cloudPath = `avatars/${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`;

      const up = await wx.cloud.uploadFile({ 
        cloudPath, filePath: file.tempFilePath 
      });

      if (!up.fileID) throw new Error('no fileID');
      this.setData({ 'form.avatar': up.fileID });

    } catch (e) {
      console.error('[profile] avatar upload', e);
      wx.showToast({ title: '头像上传失败', icon: 'none' });

    } finally {
      wx.hideLoading();
    }
  },

  openGender() { 
    if (this.data.isView) return;
    this.setData({ showGender: true }); 
  },
  onGenderSelect(e) {
    this.setData({ 
      'form.gender': e.detail, showGender: false 
    });
  },
  // 生日：编辑模式用 picker，查看模式不触发
  onBirthdayChange(e) { 
    if (this.data.isView) return;
    this.setData({ 'form.birthday': e.detail.value }); 
  },

  /** 保存：前端校验生日格式，云函数为准；失败保留表单 */
  async save() {
    if (this.data.isView || this.data.saving) return;
    const f = this.data.form;
    if (f.birthday && !/^\d{4}-\d{2}-\d{2}$/.test(f.birthday)) {
      wx.showToast({ 
        title: '生日格式应为 YYYY-MM-DD', icon: 'none' 
      });
      return;
    }
    this.setData({ saving: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'user',
        data: { action: 'updateProfile', ...f }
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
      setTimeout(() => wx.navigateBack(), 500);

    } catch (e) {
      console.error('[profile] save', e);
      wx.showToast({ 
        title: '网络异常，保存失败', icon: 'none' 
      });
    } finally {
      this.setData({ saving: false });
    }
  }
})