# 数据库迁移步骤

## 添加guest_count列到tasks表

### 问题描述
在实现房东创建任务功能时，需要在tasks表中存储入住人数(guest_count)，但当前数据库schema中tasks表缺少这个字段。

### 解决方案
在tasks表中添加guest_count列，而不是从calendar_entries表引用，原因：
1. 保持数据的独立性
2. 避免复杂的表关联查询
3. 提高查询性能

### 执行步骤

1. **在Supabase Dashboard中执行SQL迁移**：
   ```sql
   ALTER TABLE public.tasks 
   ADD COLUMN guest_count integer DEFAULT 1;
   
   COMMENT ON COLUMN public.tasks.guest_count IS '入住人数';
   ```

2. **或者使用Supabase CLI**：
   ```bash
   # 在hug_app目录下执行
   supabase db reset
   # 或者应用特定的迁移文件
   supabase db push
   ```

### 验证
迁移完成后，tasks表应该包含以下新字段：
- `guest_count` (integer, DEFAULT 1) - 入住人数

### 受影响的文件
- `supabase/schema.sql` - 更新了表定义
- `supabase/migrations/add_guest_count_to_tasks.sql` - 迁移脚本
- `lib/tasks.ts` - createTask函数现在会使用guest_count字段
