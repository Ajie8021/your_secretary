
function success(data = null, message = 'ok') {
  return {
    code: 0,
    message,
    data
  };
}

function failure(code, message) {
  return {
    code,
    message,
    data: null
  };
}

module.exports = {
  success,
  failure
};
