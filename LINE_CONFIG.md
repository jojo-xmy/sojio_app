# LINE Channel 配置说明

## 概述

HUG Cleaning App 使用两种不同的LINE Channel：

1. **LINE Login Channel** - 用于用户身份认证
2. **LINE Messaging Channel** - 用于发送消息通知

## 环境变量配置

### LINE Login Channel (身份认证)

```bash
# LINE Login Channel配置
LINE_LOGIN_CHANNEL_ID=your_line_login_channel_id
LINE_LOGIN_CHANNEL_SECRET=your_line_login_channel_secret
LINE_REDIRECT_URI=http://localhost:3000/api/auth/line
```

**用途：**
- 用户通过LINE账号登录系统
- 获取用户基本信息（姓名、头像等）
- OAuth 2.0授权流程

**配置位置：**
- LINE Developers Console → Login Channel
- 需要设置Callback URL为 `http://localhost:3000/api/auth/line`

### LINE Messaging Channel (消息推送)

```bash
# LINE Messaging Channel配置
LINE_MESSAGING_CHANNEL_ACCESS_TOKEN=your_line_messaging_channel_access_token
LINE_MESSAGING_CHANNEL_SECRET=your_line_messaging_channel_secret
```

**用途：**
- 发送任务状态变更通知
- 推送消息给用户
- 接收用户消息（Webhook）

**配置位置：**
- LINE Developers Console → Messaging Channel
- 需要设置Webhook URL为 `https://your-domain.com/api/line/webhook`

## 配置步骤

### 1. 创建LINE Login Channel

1. 访问 [LINE Developers Console](https://developers.line.biz/)
2. 创建新的Provider（如果还没有）
3. 创建 **Login Channel**
4. 配置以下设置：
   - **Channel Name**: HUG Login
   - **Channel Description**: HUG Cleaning App Login
   - **Callback URL**: `http://localhost:3000/api/auth/line`
   - **Scope**: `profile openid`

### 2. 创建LINE Messaging Channel

1. 在同一Provider下创建 **Messaging Channel**
2. 配置以下设置：
   - **Channel Name**: HUG Messaging
   - **Channel Description**: HUG Cleaning App Messaging
   - **Webhook URL**: `https://your-domain.com/api/line/webhook`
   - **Use webhook**: 启用
   - **Verify**: 启用

### 3. 环境变量设置

在 `.env.local` 文件中设置：

```bash
# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# LINE Login Channel配置
LINE_LOGIN_CHANNEL_ID=your_line_login_channel_id
LINE_LOGIN_CHANNEL_SECRET=your_line_login_channel_secret
LINE_REDIRECT_URI=http://localhost:3000/api/auth/line

# LINE Messaging Channel配置
LINE_MESSAGING_CHANNEL_ACCESS_TOKEN=your_line_messaging_channel_access_token

# JWT配置
JWT_SECRET=your_jwt_secret_key_here_make_it_long_and_random
```

## 注意事项

1. **两个Channel不能混用**：Login Channel的Access Token不能用于发送消息，Messaging Channel不能用于登录认证。

2. **域名配置**：
   - 开发环境：使用 `http://localhost:3000`
   - 生产环境：使用你的实际域名

3. **安全性**：
   - 不要将Channel Secret和Access Token提交到代码仓库
   - 使用环境变量管理敏感信息

4. **测试**：
   - 确保两个Channel都正确配置
   - 测试登录流程和消息发送功能

## 故障排除

### 登录失败
- 检查 `LINE_LOGIN_CHANNEL_ID` 和 `LINE_LOGIN_CHANNEL_SECRET` 是否正确
- 确认Callback URL配置正确

### 消息发送失败
- 检查 `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` 是否正确
- 确认用户已添加Bot为好友
- 检查Webhook配置是否正确 