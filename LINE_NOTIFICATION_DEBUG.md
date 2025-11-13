# LINE 通知调试指南

## 当前状态
已实现完整的通知发送流程，包含详细日志输出。

## 日志检查点

### 1. 浏览器控制台日志（前端）

当任务状态变更时，应该看到以下日志序列：

```
[通知] ===== 开始发送状态变更通知 =====
[通知] 任务ID: xxx
[通知] 状态变更: open → assigned
[通知] 操作用户ID: xxx
[通知] 任务信息: { hotel_name: "...", cleaning_date: "..." }
[通知] 操作用户: xxx
[通知] 通知类型: task_assigned
[通知] 准备通知 X 个接收者: [...]
[通知] 准备发送给: xxx (LINE ID: Uxxxx)
[通知] 准备发送LINE消息: { userId: "Uxxxx", messageType: "text", hasContent: true }
[通知] 调用API发送消息: { type: "text", text: "..." }
[通知] LINE消息发送成功
[通知] 发送结果: ✅ 成功 - xxx (cleaner)
[通知] ===== 通知发送流程结束 =====
```

### 2. 服务器端日志（查看终端或Vercel日志）

```
[API] ===== LINE消息发送API被调用 =====
[API] 请求参数: { userId: "Uxxxx", messageType: "text", hasText: true }
[API] 准备调用LINE Push API...
[API] 目标用户: Uxxxx
[API] 消息内容: { ... }
[API] LINE API响应状态: 200
[API] LINE API返回成功: { ... }
[API] ===== LINE消息发送完成 =====
```

## 可能的问题点

### 问题1: 看不到 "[通知] ===== 开始发送状态变更通知 =====" 日志
**原因**: 状态转换没有触发通知逻辑
**检查**:
- 确认使用了正确的状态转换函数（`taskService.updateTaskStatus()` 或直接调用 `transitionTask()`）
- 不要使用旧的状态更新方法

### 问题2: 看到 "[通知] 无需发送通知的状态转换"
**原因**: 当前状态转换不在通知范围内
**检查**:
- 确认状态转换是：assigned, accepted, in_progress, completed, confirmed
- draft → open 不会触发通知

### 问题3: 看到 "[通知] 没有需要通知的接收者"
**原因**: 
- assigned状态：任务没有分配清洁员（`assigned_cleaners`为空）
- accepted/in_progress/completed状态：系统中没有Manager角色用户
- confirmed状态：任务没有创建者

**检查**:
- 查看数据库 `tasks` 表的 `assigned_cleaners` 字段
- 查看数据库 `user_profiles` 表是否有 role='manager' 的用户
- 查看任务的 `created_by` 字段

### 问题4: 看到 "[通知] 接收者 xxx 未绑定LINE账号，跳过"
**原因**: 用户的 `line_user_id` 字段为空
**解决**: 确保用户通过LINE登录，`user_profiles` 表的 `line_user_id` 字段有值

### 问题5: 看到 "[API] LINE_MESSAGING_CHANNEL_ACCESS_TOKEN 未配置"
**原因**: 环境变量未设置
**解决**: 
1. 创建 `.env.local` 文件
2. 添加 `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN=your_token`
3. 重启开发服务器

### 问题6: 看到 "[API] LINE API返回错误"
**原因**: LINE API调用失败
**常见错误**:
- 400: 请求格式错误，检查消息格式
- 401: Access Token无效
- 404: 用户未添加Bot为好友
- 429: 请求过于频繁

**检查**:
- LINE User ID 格式是否正确（以 U 开头）
- 用户是否已添加 Bot 为好友
- Access Token 是否正确且未过期

## 测试步骤

### 步骤1: 准备测试用户
1. 确保至少有两个用户：一个Manager，一个Cleaner
2. 两个用户都必须有 `line_user_id`
3. 两个用户都必须添加LINE Bot为好友

### 步骤2: 创建测试任务
1. 以Owner身份创建任务
2. 任务状态应该是 `draft` 或 `open`

### 步骤3: 测试分配通知
1. 以Manager身份分配任务给Cleaner
2. 打开浏览器控制台
3. 执行分配操作
4. 观察控制台日志
5. 检查Cleaner的LINE是否收到消息

### 步骤4: 检查服务器日志
1. 如果使用本地开发：查看运行 `npm run dev` 的终端
2. 如果部署到Vercel：查看Vercel Dashboard的日志

## 快速诊断命令

### 检查用户LINE绑定情况
```sql
SELECT id, name, role, line_user_id 
FROM user_profiles 
WHERE line_user_id IS NOT NULL;
```

### 检查任务分配情况
```sql
SELECT id, hotel_name, status, assigned_cleaners, created_by
FROM tasks
WHERE id = 'your_task_id';
```

### 检查Manager用户
```sql
SELECT id, name, line_user_id
FROM user_profiles
WHERE role = 'manager';
```

## 联系开发者

如果以上步骤都无法解决问题，请提供：
1. 完整的浏览器控制台日志
2. 服务器日志（如果可以访问）
3. 测试时的操作步骤
4. 用户角色和LINE绑定状态






