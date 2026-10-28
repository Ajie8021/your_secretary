// pages/note/note.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    list: [],
    page: 1,
    hasMore: true,
    loading: false,
    refreshing: false
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
    // 从编辑/详情返回时刷新，保证置顶、删除、编辑结果可见
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

  /** 首次/刷新：重置到第 1 页 */
  async refresh() {
    if (this.data.refreshing) return;
    this.setData({ refreshing: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'note',
        data: { action: 'list', page: 1, pageSize: PAGE_SIZE }
      });
      const result = res.result;
      if (!result || result.code !== 0) {
        wx.showToast({ title: (result && result.message) || '加载失败', icon: 'none' });
        return;
      }
      const { list, hasMore } = result.data;
      this.setData({ list, page: 1, hasMore });
    } catch (e) {
      console.error('[note] refresh', e);
      wx.showToast({ title: '网络异常，请重试', icon: 'none' });
    } finally {
      this.setData({ refreshing: false });
    }
  },

  /** 上拉加载下一页 */
  async loadMore() {
    if (!this.data.hasMore || this.data.loading) return;

    this.setData({ loading: true });
    const nextPage = this.data.page + 1;

    try {
      const res = await wx.cloud.callFunction({
        name: 'note',
        data: { 
          action: 'list', 
          page: nextPage, 
          pageSize: PAGE_SIZE 
        }
      });

      const result = res.result;
      if (!result || result.code !== 0) {
        wx.showToast({ 
          title: (result && result.message) || '加载失败', 
          icon: 'none' });
        return;
      }

      this.setData({
        list: this.data.list.concat(result.data.list),
        page: nextPage,
        hasMore: result.data.hasMore
      });

    } catch (e) {
      console.error('[note] loadMore', e);
      wx.showToast({ 
        title: '网络异常，请重试', 
        icon: 'none' 
      });
    } finally {
      this.setData({ loading: false });
    }
  },

  /** 长按置顶/取消置顶 */
  async onLongPress(e) {
    const id = e.currentTarget.dataset.id;
    try {
      const res = await wx.cloud.callFunction({
        name: 'note',
        data: { action: 'toggleTop', id }
      });

      const result = res.result;
      if (!result || result.code !== 0) {
        wx.showToast({ 
          title: (result && result.message) || '操作失败',
          icon: 'none' 
        });
        return;
      }

      wx.showToast({ 
        title: result.data.top ? '已置顶' : '已取消置顶', 
        icon: 'none' 
      });
      this.refresh();

    } catch (err) {
      console.error('[note] toggleTop', err);
      wx.showToast({ 
        title: '网络异常，请重试', icon: 'none' 
      });
    }
  },

  /** 点击进入详情 */
  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ 
      url: `/pages/note-detail/note-detail?id=${id}` 
    });
  },

  /** 新建 */
  goCreate() {
    wx.navigateTo({ url: '/pages/note-edit/note-edit' });
  },

  // /**
  //  * 临时集成测试：在小程序内直接调用 note 云函数并断言。
  //  * 结果打印在 Console；测试完请删除本方法及其调用。
  //  * 注意：只能以"当前登录用户"身份测试，跨用户隔离（NT-07/09/16）需换账号手工验证。
  //  */
  // async runNoteTests() {
  //   const call = async (data) => {
  //     const res = await wx.cloud.callFunction({ name: 'note', data });
  //     const result = res.result || { code: -1, message: 'empty result', data: null };
  //     console.log('[note]', JSON.stringify(data), '=>', JSON.stringify(result));
  //     return result;
  //   };

  //   const results = [];
  //   const check = (name, pass, detail) => {
  //     results.push({ name, pass });
  //     console.log(`${pass ? '✅' : '❌'} ${name}`, pass ? '' : detail);
  //   };

  //   // NT-02 空标题 → 无题
  //   const c2 = await call({ action: 'create', title: '', content: '无题测试' });
  //   const id = c2.code === 0 && c2.data && c2.data.note ? c2.data.note.id : null;
  //   check('NT-02 空标题→无题', !!id && c2.data.note.title === '无题', c2);

  //   // 创建失败直接停，避免后续连锁崩
  //   if (!id) {
  //     console.warn('create 失败，停止后续用例。结果：', c2);
  //     return results;
  //   }

  //   // NT-03 空正文 → 400
  //   const c3 = await call({ action: 'create', title: 'x', content: '   ' });
  //   check('NT-03 空正文拒绝', c3.code === 400, c3);

  //   // NT-04 images 非数组 → 400
  //   const c4 = await call({ action: 'create', title: 'x', content: 'y', images: 'bad' });
  //   check('NT-04 images 非法拒绝', c4.code === 400, c4);

  //   // NT-10 更新成功且 createTime 不变
  //   const b10 = await call({ action: 'detail', id });
  //   const u10 = await call({ action: 'update', id, title: '改后', content: '改后正文' });
  //   const a10 = await call({ action: 'detail', id });
  //   const sameTime = b10.code === 0 && a10.code === 0 &&
  //     b10.data.note.createTime === a10.data.note.createTime;
  //   check('NT-10 更新且 createTime 不变',
  //     u10.code === 0 && u10.data.note.title === '改后' && sameTime,
  //     { b10, u10, a10 });

  //   // NT-13 受控字段不被覆盖
  //   const b13 = await call({ action: 'detail', id });
  //   await call({
  //     action: 'update', id, title: '受控测试',
  //     _openid: 'hacker', createTime: '2000-01-01T00:00:00.000Z', top: true
  //   });
  //   const a13 = await call({ action: 'detail', id });
  //   check('NT-13 受控字段不被覆盖',
  //     b13.code === 0 && a13.code === 0 &&
  //     b13.data.note.createTime === a13.data.note.createTime &&
  //     b13.data.note.top === a13.data.note.top,
  //     { b13, a13 });

  //   // NT-14 无可更新字段 → 400
  //   const c14 = await call({ action: 'update', id });
  //   check('NT-14 无可更新字段拒绝', c14.code === 400, c14);

  //   // NT-17 置顶往返
  //   const b17 = await call({ action: 'detail', id });
  //   const t1 = await call({ action: 'toggleTop', id });
  //   const t2 = await call({ action: 'toggleTop', id });
  //   check('NT-17 置顶往返一致',
  //     t1.code === 0 && t2.code === 0 &&
  //     t1.data.top === !b17.data.note.top && t2.data.top === b17.data.note.top,
  //     { b17, t1, t2 });

  //   // NT-18 未知 action → 400
  //   const c18 = await call({ action: 'noSuchAction' });
  //   check('NT-18 未知 action 拒绝', c18.code === 400, c18);

  //   // NT-15 删除后不可见
  //   const d15 = await call({ action: 'delete', id });
  //   const q15 = await call({ action: 'detail', id });
  //   check('NT-15 删除后不可见', d15.code === 0 && q15.code === 404, { d15, q15 });

  //   const passed = results.filter(r => r.pass).length;
  //   console.log(`=== ${passed}/${results.length} passed ===`, results);
  //   return results;
  // }
})