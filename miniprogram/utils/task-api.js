/**
 * 任务模块前端 API 封装。
 *
 * 统一从这里调用 task 云函数，避免页面重复编写调用代码。
 */

async function callTask(action, data = {}) {
  const result = await wx.cloud.callFunction({
    name: 'task',
    data: {
      action,
      ...data
    }
  });

  const response = result.result;

  if (!response || typeof response.code !== 'number') {
    throw new Error('服务器返回的数据格式不正确');
  }

  if (response.code !== 0) {
    const error = new Error(response.message || '任务操作失败');
    error.code = response.code;
    throw error;
  }

  return response.data;
}

function createTask(data) {
  return callTask('create', { data });
}

function listTasks(page = 1, pageSize = 20) {
  return callTask('list', { page, pageSize });
}

function getTaskDetail(id) {
  return callTask('detail', { id });
}

function updateTask(id, data) {
  return callTask('update', { id, data });
}

function deleteTask(id) {
  return callTask('delete', { id });
}

function toggleTaskTop(id) {
  return callTask('toggleTop', { id });
}

function toggleTaskComplete(id) {
  return callTask('toggleComplete', { id });
}

module.exports = {
  createTask,
  listTasks,
  getTaskDetail,
  updateTask,
  deleteTask,
  toggleTaskTop,
  toggleTaskComplete
};