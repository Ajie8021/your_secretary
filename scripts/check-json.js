
const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');

// 只检查小程序源码目录中的 JSON 配置文件。
const targetDirs = [
  path.join(projectRoot, 'miniprogram')
];

let hasError = false;

function checkJsonDirectory(directory) {
  if (!fs.existsSync(directory)) {
    console.error(`目录不存在：${directory}`);
    hasError = true;
    return;
  }

  for (const entry of fs.readdirSync(directory, {
    withFileTypes: true
  })) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      checkJsonDirectory(fullPath);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith('.json')) {
      continue;
    }

    try {
      // 解析 JSON；如果语法错误，JSON.parse 会抛出异常。
      const content = fs.readFileSync(fullPath, 'utf8');
      JSON.parse(content);
      console.log(`通过：${path.relative(projectRoot, fullPath)}`);
    } catch (error) {
      hasError = true;
      console.error(`失败：${path.relative(projectRoot, fullPath)}`);
      console.error(`原因：${error.message}`);
    }
  }
}

for (const directory of targetDirs) {
  checkJsonDirectory(directory);
}

if (hasError) {
  console.error('\nJSON 检查未通过，请修复上述文件。');
  process.exitCode = 1;
} else {
  console.log('\n所有检查到的 JSON 文件均合法。');
}
