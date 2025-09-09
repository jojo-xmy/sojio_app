# 日历组件改进说明

## 问题分析

原始日历组件存在以下关键问题：

1. **任务条跑到日历顶端** - 容器定位错误
2. **弹出表格被覆盖** - z-index层级冲突  
3. **跨多日bar横跨整行** - 缺少跨周折断算法

## 解决方案

### 1. 容器定位修复

**问题**: 任务条使用`position: absolute`但基准点是整个页面，导致bar跑到日历顶端。

**解决**: 
- 每个日期格子添加`position: relative`
- 任务条容器使用`position: absolute`，相对日期格子定位
- 确保bar贴合对应的格子

```tsx
<div className="relative" style={{ minHeight: '60px' }}>
  {/* 任务条在这里渲染，相对此容器定位 */}
</div>
```

### 2. 跨周折断算法

**问题**: 跨周任务显示为一条横跨整行的bar，遮挡其他格子。

**解决**: 实现`splitTaskByWeek`函数，按周拆分任务：

```tsx
function splitTaskByWeek(event: TaskCalendarEvent, weekStartDates: Date[]): TaskSegment[] {
  const segments: TaskSegment[] = [];
  const checkInDate = new Date(event.task.checkInDate);
  const checkOutDate = new Date(event.task.checkOutDate);
  
  let currentStart = checkInDate;
  let weekIndex = 0;

  while (isBefore(currentStart, checkOutDate) || isSameDay(currentStart, checkOutDate)) {
    // 找到当前日期属于哪一周
    const currentWeekStart = weekStartDates.find(weekStart => 
      isSameDay(currentStart, weekStart) || 
      (isAfter(currentStart, weekStart) && isBefore(currentStart, addDays(weekStart, 7)))
    );
    
    const weekEnd = addDays(currentWeekStart, 6);
    const segmentEnd = min([checkOutDate, weekEnd]);

    segments.push({
      id: `${event.id}-${weekIndex}`,
      title: event.task.hotelName,
      start: currentStart,
      end: segmentEnd,
      originalEvent: event,
      weekIndex: weekStartDates.indexOf(currentWeekStart)
    });

    currentStart = addDays(segmentEnd, 1);
    weekIndex++;
  }

  return segments;
}
```

### 3. z-index层级管理

**问题**: 任务条层级过高，覆盖弹出层。

**解决**: 
- 任务条z-index: 10-20
- 弹出层z-index: 1000+
- 状态标签z-index: 20

```tsx
style={{
  zIndex: 10 + stackIndex // 确保不覆盖弹出层
}}
```

### 4. 重叠任务堆叠

**问题**: 同一天多个任务重叠显示混乱。

**解决**: 实现`getStackIndex`函数，基于当天bar数量分配层级：

```tsx
function getStackIndex(segment: TaskSegment, dayEvents: TaskSegment[]): number {
  const sameDaySegments = dayEvents.filter(s => 
    s.weekIndex === segment.weekIndex && 
    (isSameDay(s.start, segment.start) || 
     (isBefore(s.start, segment.start) && isAfter(s.end, segment.start)))
  );
  
  return sameDaySegments.indexOf(segment);
}
```

## 技术实现细节

### 数据结构

```tsx
interface TaskSegment {
  id: string;
  title: string;
  start: Date;
  end: Date;
  originalEvent: TaskCalendarEvent;
  weekIndex: number;
}
```

### 渲染逻辑

1. **拆分任务**: 使用`flatMap(splitTaskByWeek)`将所有任务拆分为周段
2. **按周渲染**: 每个日期格子只渲染属于当周的任务段
3. **层级分配**: 基于当天任务数量分配垂直层级
4. **精确定位**: 使用相对定位确保bar贴合格子

### 关键改进点

- ✅ 使用`date-fns`库进行精确的日期计算
- ✅ 实现真正的跨周折断，避免横跨整行
- ✅ 修复容器定位，确保bar在正确位置
- ✅ 优化z-index管理，避免层级冲突
- ✅ 实现智能堆叠，支持多任务重叠显示

## 测试验证

访问 `/test-calendar-improved` 页面可以查看改进效果：

- 任务条正确贴合日期格子
- 跨周任务正确折断显示
- 弹出层不再被覆盖
- 重叠任务整齐堆叠
- 状态标签精确定位

## 性能优化

- 使用`useMemo`缓存计算结果
- 避免不必要的重新渲染
- 优化日期计算逻辑
- 减少DOM操作

这些改进确保了日历组件的稳定性和用户体验。
