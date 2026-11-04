# 部署与配置说明

## 1. 云环境
- 环境 ID：
- 初始化：开发者工具 → 云开发 → 开通

## 2. 数据库集合
- users / tasks / notes / admins / feedbacks 均需手工创建
- 权限：建议“仅创建者可读写”或“所有用户不可读写”，业务全部走云函数

## 3. 索引
- tasks：_openid + top + level + ddl + createTime
- notes：_openid + top + createTime
- feedbacks：_openid + createTime；createTime（管理端）
- users / admins：_openid

## 4. 云函数部署
- 每个云函数：上传并部署 → 云端安装依赖
- 确认 utils.js 随包上传
- 配置环境变量（如显式 env 时）

## 5. 定时触发器
- sendReminder：每分钟触发；测试后可临时调频，务必恢复

## 6. 订阅消息
- 模板 ID：
- 字段映射：任务名称、截止时间
- 一次性订阅，用户拒绝不影响任务保存

## 7. 管理员白名单
- 在 admins 集合插入 { _openid, name }
- 变更需人工维护，建议记录变更日志