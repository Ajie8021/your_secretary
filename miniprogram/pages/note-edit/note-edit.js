// pages/note-edit/note-edit.js
const MAX_IMAGES = 9;

Page({

  /**
   * 页面的初始数据
   */
  data: {
    id: '',            // 空 = 新建
    title: '',
    content: '',
    images: [],        // 已上传的 fileID 列表
    maxImages: MAX_IMAGES,
    uploading: false,
    saving: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    if (options && options.id) {
      this.setData({ id: options.id });
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

  onTitleInput(e) {
    // van-field 的 change 事件 e.detail 直接是值
    this.setData({ title: e.detail || '' });
  },
  onContentInput(e) {
    this.setData({ content: e.detail || '' });
  },

  /** 编辑模式加载详情 */
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
          icon: 'none' 
        });
        return;
      }
      const n = result.data.note;
      this.setData({ 
        title: n.title, 
        content: n.content, 
        images: n.images 
      });
    } catch (e) {
      console.error('[note-edit] loadDetail', e);
      wx.showToast({ 
        title: '网络异常，请重试', icon: 'none' 
      });
    }
  },

  /** 选择并上传图片：逐张上传，成功才加入 images */
  async chooseImages() {
    const remain = this.data.maxImages - this.data.images.length;
    if (remain <= 0) {
      wx.showToast({ 
        title: `最多 ${this.data.maxImages} 张`, icon: 'none' 
      });
      return;
    }
    let chosen;
    try {
      chosen = await wx.chooseMedia({
        count: remain,
        mediaType: ['image'],
        sizeType: ['compressed']
      });
    } catch (e) {
      // 用户取消不提示
      return;
    }
    this.setData({ uploading: true });
    const uploaded = [];
    for (const f of chosen.tempFiles) {
      try {
        const ext = (
          f.tempFilePath.match(/\.[a-zA-Z0-9]+$/) || ['.jpg']
        )[0];

        const cloudPath = `debug/${Date.now()}.jpg`;
        
        const up = await wx.cloud.uploadFile({
          cloudPath, filePath: f.tempFilePath 
        });

        if (up.fileID) uploaded.push(up.fileID);

      } catch (err) {
        console.error('[note-edit] upload fail', err);
        wx.showToast({ 
          title: '部分图片上传失败', icon: 'none' 
        });
      }
    }
    this.setData({
      images: this.data.images.concat(uploaded),
      uploading: false
    });
  },

  /** 删除已选图片（仅从表单移除，云文件清理走独立策略） */
  removeImage(e) {
    const idx = e.currentTarget.dataset.index;
    const images = this.data.images.slice();
    images.splice(idx, 1);
    this.setData({ images });
  },

  /** 保存：前端基础校验 + 调云函数，云函数为准 */
  async save() {
    if (this.data.saving || this.data.uploading) return;

    const title = this.data.title.trim();
    const content = this.data.content.trim();
    if (!content) {
      wx.showToast({ 
        title: '正文不能为空', icon: 'none' 
      });
      return;
    }

    this.setData({ saving: true });
    try {
      const isEdit = !!this.data.id;
      const payload = {
        action: isEdit ? 'update' : 'create',
        title,
        content,
        images: this.data.images
      };
      if (isEdit) payload.id = this.data.id;

      const res = await wx.cloud.callFunction({ 
        name: 'note', data: payload 
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
      console.error('[note-edit] save', e);
      wx.showToast({ 
        title: '网络异常，保存失败', icon: 'none' 
      });
    } finally {
      this.setData({ saving: false });
    }
  }
})