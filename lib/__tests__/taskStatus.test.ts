import { TaskStatus, UserRole, canTransitionTask, TASK_STATUS_TRANSITIONS } from '@/types/task';
import { canTransitionTo, getAvailableTransitions, canOperateTask } from '@/lib/taskStatus';

describe('Task Status Tests', () => {
  describe('状态转换验证', () => {
    test('draft -> open 转换应该成功', () => {
      expect(canTransitionTo('draft', 'open')).toBe(true);
    });

    test('draft -> completed 转换应该失败', () => {
      expect(canTransitionTo('draft', 'completed')).toBe(false);
    });

    test('confirmed 状态不应该有后续转换', () => {
      expect(TASK_STATUS_TRANSITIONS.confirmed).toEqual([]);
    });
  });

  describe('权限验证', () => {
    test('manager 可以将 draft 转换为 open', () => {
      expect(canTransitionTask('draft', 'open', 'manager')).toBe(true);
    });

    test('cleaner 不能将 draft 转换为 open', () => {
      expect(canTransitionTask('draft', 'open', 'cleaner')).toBe(false);
    });

    test('cleaner 可以接受 assigned 任务', () => {
      expect(canTransitionTask('assigned', 'accepted', 'cleaner')).toBe(true);
    });

    test('manager 可以确认 completed 任务', () => {
      expect(canTransitionTask('completed', 'confirmed', 'manager')).toBe(true);
    });
  });

  describe('可用转换选项', () => {
    test('draft 状态的可用转换', () => {
      expect(getAvailableTransitions('draft')).toEqual(['open']);
    });

    test('open 状态的可用转换', () => {
      expect(getAvailableTransitions('open')).toEqual(['assigned', 'draft']);
    });

    test('assigned 状态的可用转换', () => {
      expect(getAvailableTransitions('assigned')).toEqual(['accepted', 'open']);
    });
  });

  describe('操作权限', () => {
    test('manager 可以编辑 draft 任务', () => {
      expect(canOperateTask('draft', 'manager', 'edit')).toBe(true);
    });

    test('cleaner 不能编辑 draft 任务', () => {
      expect(canOperateTask('draft', 'cleaner', 'edit')).toBe(false);
    });

    test('cleaner 可以接受 assigned 任务', () => {
      expect(canOperateTask('assigned', 'cleaner', 'accept')).toBe(true);
    });

    test('cleaner 可以完成 in_progress 任务', () => {
      expect(canOperateTask('in_progress', 'cleaner', 'complete')).toBe(true);
    });

    test('manager 可以确认 completed 任务', () => {
      expect(canOperateTask('completed', 'manager', 'confirm')).toBe(true);
    });
  });

  describe('状态流程完整性', () => {
    test('完整的状态转换流程', () => {
      const flow = ['draft', 'open', 'assigned', 'accepted', 'in_progress', 'completed', 'confirmed'];
      
      for (let i = 0; i < flow.length - 1; i++) {
        const current = flow[i] as TaskStatus;
        const next = flow[i + 1] as TaskStatus;
        
        // 检查转换是否在允许的转换列表中
        expect(TASK_STATUS_TRANSITIONS[current]).toContain(next);
      }
    });
  });
}); 