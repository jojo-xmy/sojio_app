# 🏨 SOJIO - 智能酒店清洁管理系统

一个基于 Next.js 的酒店清洁任务管理平台，集成 LINE 登录和通知功能。

## ✨ 主要功能

- 🔐 **LINE OAuth 登录** - 使用 LINE 账号快速登录
- 👥 **多角色管理** - Owner、Manager、Cleaner 三种角色
- 📅 **任务调度** - 可视化日历管理清洁任务
- 📱 **LINE 通知** - 实时任务提醒和状态更新
- 🏨 **酒店管理** - 多酒店/房间管理
- 📊 **数据统计** - 任务完成情况追踪

## 🛠️ 技术栈

- **框架**: Next.js 15 (App Router)
- **数据库**: Supabase (PostgreSQL)
- **认证**: LINE Login + JWT
- **UI**: React 19 + Tailwind CSS
- **状态管理**: Zustand
- **日历**: React Big Calendar
- **部署**: Vercel

## 🚀 快速开始

### 本地开发

1. **克隆项目**
```bash
git clone <your-repo-url>
cd hug_app
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**

创建 `.env.local` 文件，参考 [ENV_TEMPLATE.md](./ENV_TEMPLATE.md) 配置所有必需的环境变量。

4. **启动开发服务器**
```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

### 生产部署

#### 🎯 快速部署到 Vercel

推荐阅读：**[快速部署指南](./VERCEL_快速部署指南.md)** ⚡

只需 3 步，10 分钟完成部署：
1. 推送代码到 GitHub
2. 在 Vercel 导入并配置
3. 更新环境变量和 LINE 配置

#### 📚 完整部署文档

- **[快速部署指南](./VERCEL_快速部署指南.md)** - 简洁易懂的 3 步部署
- **[完整部署指南](./VERCEL部署指南.md)** - 详细的部署说明和故障排除
- **[环境变量模板](./ENV_TEMPLATE.md)** - 所有必需的配置说明
- **[部署检查清单](./DEPLOYMENT_CHECKLIST.md)** - 确保不遗漏任何步骤

## 📁 项目结构

```
hug_app/
├── app/                    # Next.js App Router
│   ├── api/               # API 路由
│   │   ├── auth/         # 认证相关
│   │   ├── line/         # LINE 集成
│   │   └── cron/         # 定时任务
│   ├── dashboard/        # 主应用页面
│   └── (auth)/           # 登录注册页面
├── components/           # React 组件
├── lib/                  # 工具库和服务
├── store/                # 状态管理
├── types/                # TypeScript 类型
├── supabase/            # 数据库模式和迁移
└── public/              # 静态资源
```

## 🔐 环境变量

必需的环境变量（共 10 个）：

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 项目 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 匿名密钥
- `LINE_LOGIN_CHANNEL_ID` - LINE Login Channel ID
- `LINE_LOGIN_CHANNEL_SECRET` - LINE Login 密钥
- `LINE_REDIRECT_URI` - OAuth 回调地址
- `LINE_MESSAGING_CHANNEL_ACCESS_TOKEN` - LINE Bot 令牌
- `LINE_MESSAGING_CHANNEL_SECRET` - LINE Bot 密钥
- `JWT_SECRET` - JWT 加密密钥
- `CRON_SECRET` - Cron Job 验证密钥
- `NOTIFICATION_API_KEY` - 通知 API 密钥
- `NEXT_PUBLIC_SITE_URL` - 应用完整 URL

详细说明请查看 **[ENV_TEMPLATE.md](./ENV_TEMPLATE.md)**

## 📱 用户角色

### Owner（所有者）
- 管理所有酒店
- 创建和分配任务
- 查看所有数据统计

### Manager（经理）
- 管理分配的酒店
- 审核清洁任务
- 发送通知给清洁员

### Cleaner（清洁员）
- 接收任务通知
- 更新任务状态
- 上传完成照片

## 🔄 定时任务

项目配置了自动通知发送功能（每 5 分钟执行）：

- **Vercel Pro 计划**: 自动支持 Cron Jobs
- **免费计划**: 需要使用外部服务（如 [cron-job.org](https://cron-job.org)）

详见 [快速部署指南](./VERCEL_快速部署指南.md#-cron-job-说明)

## 🧪 测试

```bash
# 运行开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 运行 linter
npm run lint
```

## 📝 开发脚本

```json
{
  "dev": "next dev --turbopack",
  "build": "next build",
  "start": "next start",
  "lint": "next lint"
}
```

## 🤝 贡献

欢迎贡献代码、报告问题或提出建议！

## 📄 许可证

MIT License

## 🆘 需要帮助？

- 📖 查看 [完整部署指南](./VERCEL部署指南.md)
- ✅ 使用 [部署检查清单](./DEPLOYMENT_CHECKLIST.md)
- 💬 查看 Vercel 部署日志
- 🔍 检查浏览器控制台错误

## 🔗 相关链接

- [Next.js 文档](https://nextjs.org/docs)
- [Supabase 文档](https://supabase.com/docs)
- [LINE Developers](https://developers.line.biz/)
- [Vercel 文档](https://vercel.com/docs)

---

**最后更新**: 2025-11-13

**技术支持**: 查看项目文档或提交 Issue
