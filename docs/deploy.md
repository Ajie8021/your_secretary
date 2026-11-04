# 部署与配置说明

## 1. 前置
- 微信开发者工具版本、基础库版本
- 小程序 AppID、云开发环境 ID

## 2. 云环境
- 开通云开发，记录环境 ID
- app.js 中 wx.cloud.init 的 env 与之一致

## 3. 数据库集合（必须手工创建）
- users / tasks / notes / admins / feedbacks
- 每个集合的权限设置
- 索引：tasks(_openid,top,level,ddl,createTime)、notes(_openid,top,createTime)、
  feedbacks(_openid,createTime 及管理端 createTime)、users/admins(_openid)

## 4. 云存储
- 权限设置（读写规则）
- 安全规则中放行的路径前缀（如 note-images/、task-images/、avatars/）
- 这条要写清楚，否则新环境上传会报 -503002

## 5. 云函数部署
- 逐个：上传并部署 → 云端安装依赖
- 确认 response.js / utils.js 随包上传
- 环境变量（如有）

## 6. 定时触发器
- sendReminder 每分钟；测试调频后必须恢复

## 7. 订阅消息
- 模板 ID、字段映射（thing1/thing4/time10 与实际模板对应）
- 一次性订阅说明；用户拒绝不影响任务保存

## 8. 管理员白名单
- admins 集合插入 { _openid, name }
- 变更需人工维护，建议记录变更日志

## 9. 验证部署成功
- 新号登录建资料
- 创建带提醒任务并确认到点发送
- 上传图片成功
- 非管理员调 admin 返回 403