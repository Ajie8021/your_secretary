# 设计文档

## 一、系统架构

```tex
小程序端（原生 + Vant Weapp）
        ↓ wx.cloud.callFunction
微信云开发
├─ 云函数（业务逻辑 / 定时触发 / 订阅推送）
├─ 云数据库（users / tasks / notes / admins / feedbacks）
├─ 云存储（图片）
└─ 订阅消息
```

------

## 二、数据库设计

### users

| 字段       | 类型   | 说明                |
| :--------- | :----- | :------------------ |
| _openid    | string | 微信 openid（主键） |
| avatar     | string | 头像                |
| nickname   | string | 昵称                |
| gender     | string | 性别，默认"保密"    |
| birthday   | string | 出生日期            |
| address    | string | 地址                |
| job        | string | 职业                |
| createTime | date   | 创建时间            |

### tasks

| 字段       | 类型    | 说明                                        |
| :--------- | :------ | :------------------------------------------ |
| _id        | string  | 主键                                        |
| _openid    | string  | 所属用户                                    |
| name       | string  | 任务名称，默认"无名"                        |
| type       | string  | 类型标签（学习/工作/兴趣/饮食/出行/自定义） |
| level      | number  | 重要程度 1-4（4 最高），颜色区分            |
| ddl        | date    | 截止时间（必填）                            |
| content    | string  | 任务内容（必填）                            |
| images     | array   | 图片 fileID 列表                            |
| top        | boolean | 是否置顶                                    |
| remindAt   | date    | 提醒时间（可空）                            |
| reminded   | boolean | 是否已推送，默认 false                      |
| createTime | date    | 创建时间                                    |

### notes

| 字段       | 类型    | 说明             |
| :--------- | :------ | :--------------- |
| _id        | string  | 主键             |
| _openid    | string  | 所属用户         |
| title      | string  | 标题，默认"无题" |
| content    | string  | 正文             |
| images     | array   | 图片 fileID 列表 |
| top        | boolean | 是否置顶         |
| createTime | date    | 记录时间         |

### admins

| 字段    | 类型   | 说明          |
| :------ | :----- | :------------ |
| _openid | string | 管理员 openid |
| name    | string | 备注名        |

### feedbacks

| 字段       | 类型   | 说明     |
| :--------- | :----- | :------- |
| _id        | string | 主键     |
| _openid    | string | 提交用户 |
| content    | string | 反馈内容 |
| reply      | string | 回复内容 |
| repliedAt  | date   | 回复时间 |
| createTime | date   | 提交时间 |

------

## 三、云函数设计

| 云函数       | 功能     | 关键逻辑                                  |
| :----------- | :------- | :---------------------------------------- |
| login        | 登录     | 获取 openid，首次写入 users               |
| task         | 任务管理 | 增删改查、置顶；按 top + level 排序       |
| note         | 随笔管理 | 增删改查、置顶；按 top + createTime 排序  |
| user         | 用户信息 | 读写基础信息                              |
| admin        | 管理员   | 校验 openid 是否在 admins；反馈列表、统计 |
| feedback     | 反馈     | 提交、修改（回复后禁止）                  |
| sendReminder | 定时推送 | 定时触发器，扫描到点任务并推送            |
| stats        | 统计     | 聚合用户性别/年龄/地域/职业               |

------

## 四、关键流程

### 1. 登录

```tex
小程序启动 → 调用 login 云函数
→ 云函数取 openid → 查 users
→ 存在则返回，不存在则创建
→ 前端存 globalData
```

### 2. 添加任务 + 提醒

```tex
填写任务表单（名称/类型/level/ddl/content/图片）
→ 选择是否提醒 → 若是，选提醒时间
→ 调用 wx.requestSubscribeMessage 申请授权
→ 用户允许 → 调用 task 云函数保存
→ 写入 remindAt、reminded=false
```

### 3. 定时推送（sendReminder）

```tex
定时触发器（每分钟）
→ 查 tasks: remindAt <= now && reminded = false
→ 逐条调用 subscribeMessage.send
→ 成功后 reminded = true
→ 失败记录日志
```

### 4. 管理员鉴权

```tex
进入管理员页 → 调用 admin 云函数
→ 云函数取 openid → 查 admins 集合
→ 在则返回数据，不在则拒绝
→ 前端用 wx:if 控制入口显示
```

------

## 五、页面结构

```tex
pages/
├─ login/          登录
├─ task/           任务列表 + 添加/编辑
├─ note/           随笔列表 + 添加/编辑
├─ mine/           我的
│   ├─ profile/    基础信息
│   ├─ feedback/   反馈建议
│   └─ message/    系统消息
└─ admin/          管理员端（缓做）
    ├─ feedback/   反馈管理
    └─ stats/      统计
```

------

## 六、关键技术点

| 点         | 方案                                               |
| :--------- | :------------------------------------------------- |
| 推送限制   | 一次性订阅，单任务仅推 1 条                        |
| 定时任务   | 云函数定时触发器（cron）                           |
| 管理员鉴权 | admins 集合白名单 openid                           |
| 排序       | top 优先，其次 level（任务）/ createTime（随笔）   |
| 图片       | wx.chooseMedia → wx.cloud.uploadFile → 存 fileID   |
| 重要程度   | 讲时间管理四象限一维话，设置 level 1-4，以颜色区分 |

------

## 七、开发计划

| 阶段 | 内容                           |
| :--- | :----------------------------- |
| 1    | 登录 + 任务增删改查 + 排序置顶 |
| 2    | 订阅消息 + 定时推送            |
| 3    | 随笔 + 我的 · 基础信息         |
| 4    | 反馈、管理员端                 |
| 5    | 用户数据统计（缓做）           |