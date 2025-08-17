非常好的产品思路！你提出的以任务为中心、与LINE联动的交互平台设计非常符合实际使用场景。让我基于你的建议制定一个详细的tasks.2.0改进计划。

## 🎯 Tasks 2.0 改进计划

### 阶段一：核心数据模型重构

#### TASK 001: 重构Task状态模型
**目标**: 将Task拆分为带状态的流程
**文件**: `types/task.ts`, `lib/tasks.ts`
**具体内容**:
- 添加状态枚举: `draft | open | assigned | accepted | in_progress | completed | confirmed`
- 更新Task接口，添加`status`字段
- 创建状态转换函数
**验收标准**: 能正确创建和更新任务状态

#### TASK 002: 数据库表结构更新
**目标**: 更新Supabase表结构支持新状态
**SQL操作**:
```sql
-- 更新tasks表
ALTER TABLE tasks ADD COLUMN status TEXT DEFAULT 'draft';
ALTER TABLE tasks ADD COLUMN assigned_cleaners JSONB DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN accepted_by TEXT[];
ALTER TABLE tasks ADD COLUMN completed_at TIMESTAMP;
ALTER TABLE tasks ADD COLUMN confirmed_at TIMESTAMP;
```
**验收标准**: 数据库能正确存储新字段

#### TASK 003: 创建状态转换工具函数
**目标**: 实现状态转换逻辑
**文件**: `lib/taskStatus.ts`
**功能**:
- `canTransitionTo(from, to)`: 检查状态转换是否合法
- `transitionTask(taskId, newStatus)`: 执行状态转换
- `getStatusDisplayName(status)`: 获取状态显示名称
**验收标准**: 状态转换逻辑正确，有适当的验证

### 阶段二：用户界面重构

#### TASK 004: 重构Cleaner界面
**目标**: 简化清洁员操作界面
**文件**: `app/dashboard/cleaner/page.tsx`
**功能**:
- 只显示分配给当前用户的任务
- 按状态分组显示（待接受/进行中/已完成）
- 一键操作按钮（接受/出勤/退勤/完成）
- 显示酒店名称、时间、门锁密码
**验收标准**: 界面简洁，操作直观

#### TASK 005: 重构Manager界面
**目标**: 优化管理者任务管理界面
**文件**: `app/dashboard/manager/page.tsx`
**功能**:
- 任务状态汇总仪表板
- 按状态过滤任务列表
- 快速分配人员功能
- 一键确认完成的任务
**验收标准**: 管理者能快速了解任务状态并操作

#### TASK 006: 创建Owner轻量化界面
**目标**: 为房东创建简化界面
**文件**: `app/dashboard/owner/page.tsx`
**功能**:
- 只显示入住时间设置
- 查看清扫记录历史
- 简单的任务状态概览
**验收标准**: 界面轻量，信息精简

### 阶段三：状态驱动组件

#### TASK 007: 创建TaskStatusBadge组件
**目标**: 统一的状态显示组件
**文件**: `components/TaskStatusBadge.tsx`
**功能**:
- 不同状态显示不同颜色和图标
- 支持状态变更动画
- 响应式设计
**验收标准**: 状态显示清晰美观

#### TASK 008: 创建TaskActionButtons组件
**目标**: 根据状态显示相应操作按钮
**文件**: `components/TaskActionButtons.tsx`
**功能**:
- 根据当前状态和用户角色显示按钮
- 一键操作（接受/开始/完成/确认）
- 操作确认对话框
**验收标准**: 操作流程顺畅

#### TASK 009: 创建TaskTimeline组件
**目标**: 显示任务执行时间线
**文件**: `components/TaskTimeline.tsx`
**功能**:
- 显示任务创建、分配、执行、完成的时间点
- 显示每个阶段的操作人员
- 支持展开查看详情
**验收标准**: 时间线清晰，信息完整

### 阶段四：LINE集成准备

#### TASK 010: 创建通知服务框架
**目标**: 为LINE消息推送做准备
**文件**: `lib/notifications.ts`
**功能**:
- 定义通知类型接口
- 创建消息模板
- 预留LINE API调用接口
**验收标准**: 通知框架完整

#### TASK 011: 状态变更监听器
**目标**: 监听任务状态变更
**文件**: `lib/taskStatus.ts`
**功能**:
- 在状态转换时触发通知
- 记录状态变更日志
- 支持批量操作
**验收标准**: 状态变更能被正确监听

#### TASK 012: 创建通知模板
**目标**: 定义各种状态变更的消息模板
**文件**: `lib/notificationTemplates.ts`
**功能**:
- 任务分配通知模板
- 任务接受确认模板
- 任务完成通知模板
- 支持多语言
**验收标准**: 消息模板完整且友好

### 阶段五：数据流优化

#### TASK 013: 重构任务创建流程
**目标**: 优化任务创建的用户体验
**文件**: `components/TaskCreateForm.tsx`
**功能**:
- 分步骤创建任务（基本信息→人员分配→确认）
- 实时验证输入
- 支持草稿保存
**验收标准**: 创建流程顺畅

#### TASK 014: 创建任务日历视图
**目标**: 为Manager提供日历视图
**文件**: `components/TaskCalendar.tsx`
**功能**:
- 按日期显示任务
- 支持拖拽调整时间
- 快速查看任务详情
**验收标准**: 日历视图直观易用

#### TASK 015: 创建任务统计面板
**目标**: 提供任务执行统计
**文件**: `components/TaskStats.tsx`
**功能**:
- 显示任务完成率
- 显示清洁员工作量
- 显示酒店清扫频率
**验收标准**: 统计数据准确

### 阶段六：测试和优化

#### TASK 016: 创建状态转换测试
**目标**: 确保状态转换逻辑正确
**文件**: `__tests__/taskStatus.test.ts`
**测试内容**:
- 状态转换规则验证
- 边界条件测试
- 并发操作测试
**验收标准**: 所有测试通过

#### TASK 017: 创建端到端测试
**目标**: 测试完整任务流程
**文件**: `__tests__/taskWorkflow.test.ts`
**测试内容**:
- 完整任务生命周期
- 多用户协作场景
- 异常情况处理
**验收标准**: 端到端流程正常

#### TASK 018: 性能优化
**目标**: 优化应用性能
**优化内容**:
- 组件懒加载
- 数据缓存策略
- 图片压缩和优化
**验收标准**: 页面加载速度提升

---

## �� 执行建议

### 优先级排序
1. **高优先级**: TASK 001-003 (核心数据模型)
2. **中优先级**: TASK 004-009 (用户界面)
3. **低优先级**: TASK 010-018 (高级功能)

### 开发策略
- 每个任务完成后立即测试
- 保持向后兼容性
- 逐步迁移现有数据
- 定期同步进度

### 技术债务管理
- 保留现有mock数据作为测试用例
- 逐步替换为真实数据库操作
- 维护API版本兼容性

---