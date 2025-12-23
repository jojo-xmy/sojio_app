sojio-app/
├── app/                              # Next.js 15 App Router 页面目录
│   ├── (auth)/                      # 认证路由组
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── register/
│   │       └── page.tsx
│   ├── admin/                       # 管理员页面
│   │   └── registration-applications/
│   │       └── page.tsx
│   ├── dashboard/                   # 主面板（按角色重定向）
│   │   ├── cleaner/                 # 清洁人员主界面
│   │   │   ├── availability/
│   │   │   │   └── page.tsx
│   │   │   ├── tasks/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── manager/                 # 管理者主界面
│   │   │   ├── applications/
│   │   │   │   └── page.tsx
│   │   │   ├── hotels/
│   │   │   │   └── page.tsx
│   │   │   ├── schedule/
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   ├── owner/                   # 业主主界面
│   │   │   ├── hotels/
│   │   │   │   ├── [hotelId]/
│   │   │   │   │   └── calendar/
│   │   │   │   │       └── page.tsx
│   │   │   │   └── page.tsx
│   │   │   └── page.tsx
│   │   └── page.tsx                 # 仪表板入口（角色重定向）
│   ├── task/                        # 任务详情页面
│   │   └── [id]/
│   │       └── page.tsx
│   ├── api/                         # API 路由（Next.js API Routes）
│   │   ├── admin/                   # 管理员 API
│   │   │   ├── approve-my-manager/
│   │   │   └── registration-applications/
│   │   │       └── route.ts
│   │   ├── auth/                    # 认证相关 API
│   │   │   ├── line/                # LINE 认证
│   │   │   │   ├── login-with-role/
│   │   │   │   │   └── route.ts
│   │   │   │   ├── profile/
│   │   │   │   │   └── route.ts
│   │   │   │   └── route.ts
│   │   │   ├── register/
│   │   │   │   └── route.ts
│   │   │   └── user-roles/
│   │   │       └── route.ts
│   │   ├── cron/                    # 定时任务 API
│   │   │   └── notifications/
│   │   │       └── route.ts
│   │   ├── line/                    # LINE Bot API
│   │   │   ├── send-message/
│   │   │   │   └── route.ts
│   │   │   └── webhook/
│   │   │       └── route.ts
│   │   └── notifications/           # 通知 API
│   │       └── send/
│   │           └── route.ts
│   ├── globals.css                  # 全局样式
│   ├── layout.tsx                   # 全局布局
│   └── page.tsx                     # 首页
│
├── components/                      # 可复用组件
│   ├── providers/                   # Context Providers
│   │   ├── LanguageProvider.tsx
│   │   └── TranslationOrchestrator.tsx
│   ├── AnchoredDetailPopover.tsx
│   ├── AttachmentGallery.tsx
│   ├── AttendanceActions.tsx
│   ├── AttendanceSummary.tsx
│   ├── Button.tsx
│   ├── CalendarEntryForm.tsx
│   ├── CleaningCompletionForm.tsx
│   ├── ClearAuthButton.tsx
│   ├── CustomTaskCalendar.tsx
│   ├── DashboardHeader.tsx
│   ├── HeaderButton.tsx
│   ├── ImageUpload.tsx
│   ├── LanguageSwitcher.tsx
│   ├── LoginRoleSelector.tsx
│   ├── LoginStatusCheck.tsx
│   ├── MultiDateSelector.tsx
│   ├── NotionStyleCalendar.tsx
│   ├── OwnerTaskCalendar.tsx
│   ├── RoleSelector.tsx
│   ├── TaskActionButtons.tsx
│   ├── TaskAssignmentModal.tsx
│   ├── TaskCalendar.tsx
│   ├── TaskCard.tsx
│   ├── TaskCreateForm.tsx
│   ├── TaskDetailPanel.tsx
│   ├── TaskStatusBadge.tsx
│   ├── UserProfileMenu.tsx
│   └── UserStateInitializer.tsx
│
├── hooks/                           # 自定义 React Hooks
│   ├── useCalendarEntry.ts
│   ├── usePageRefresh.ts
│   ├── useRefresh.ts
│   └── useTranslation.ts
│
├── lib/                             # 通用工具函数和服务
│   ├── services/                    # 业务逻辑服务层
│   │   ├── assignmentService.ts    # 任务分配服务
│   │   ├── calendarEntryService.ts  # 日历条目服务
│   │   ├── managerHotelService.ts   # 管理者酒店服务
│   │   └── taskService.ts           # 任务服务
│   ├── attendance.ts                # 考勤相关工具
│   ├── calendar.ts                  # 日历相关工具
│   ├── hotelManagement.ts           # 酒店管理工具
│   ├── lineAuth.ts                  # LINE 认证工具
│   ├── notifications.ts             # 通知工具
│   ├── notificationService.ts       # 通知服务
│   ├── notificationTemplates.ts     # 通知模板
│   ├── supabase.ts                  # Supabase 客户端初始化
│   ├── taskCapabilities.ts          # 任务能力相关
│   ├── tasks.ts                     # 任务相关工具
│   ├── taskStatus.ts                # 任务状态管理
│   ├── translationService.ts        # 翻译服务
│   ├── upload.ts                    # 文件上传工具
│   ├── useTask.ts                   # 任务 Hook
│   └── utils.ts                     # 通用工具函数
│
├── store/                           # Zustand 全局状态管理
│   └── userStore.ts                 # 用户状态存储
│
├── public/                          # 静态资源
│   ├── favicon.ico
│   └── SOJIO_LOGO.png
│
├── locales/                         # i18n 多语言文本
│   ├── en.ts                        # 英语
│   ├── ja.ts                        # 日语
│   ├── zh.ts                        # 中文
│   └── index.ts                     # 多语言导出
│
├── types/                           # TypeScript 类型定义
│   ├── calendar.ts                  # 日历类型
│   ├── hotel.ts                     # 酒店类型
│   ├── task.ts                      # 任务类型
│   └── user.ts                      # 用户类型
│
├── supabase/                        # Supabase 配置和迁移
│   ├── migrations/                  # 数据库迁移文件
│   │   ├── 005_optimize_calendar_task_trigger.sql
│   │   ├── 006_cleanup_old_triggers.sql
│   │   ├── 007_fix_calendar_task_trigger.sql
│   │   ├── 008_enable_cascade_calendar_entry_delete.sql
│   │   ├── 009_add_manager_report_notes_to_tasks.sql
│   │   └── 010_create_manager_hotels_table.sql
│   ├── cleaner_availability_data.js # 清洁人员可用性数据
│   ├── config.toml                  # Supabase 配置
│   ├── database_function.md         # 数据库函数文档
│   ├── database_triggers.md         # 数据库触发器文档
│   ├── schema.sql                   # 数据库架构
│   └── tasks_data.js                # 任务数据
│
├── components.json                  # shadcn/ui 组件配置
├── next.config.ts                   # Next.js 配置
├── package.json                     # 项目依赖
├── postcss.config.js                # PostCSS 配置
├── tailwind.config.js               # Tailwind CSS 配置
├── tsconfig.json                    # TypeScript 配置
├── .env.local                       # 环境变量（含 Supabase key, LINE API key）
└── README.md                        # 项目说明文档

