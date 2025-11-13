// 能力矩阵：根据角色、任务状态与上下文，返回可见区块与可执行动作
import { TaskStatus } from '@/types/task';

export type ViewerRole = 'owner' | 'manager' | 'cleaner';

export interface CapabilityContext {
  isAssignedCleaner?: boolean;
  hasAccepted?: boolean;
  attendance?: {
    hasCheckIn: boolean;
    hasCheckOut: boolean;
    checkInTime?: string;
    checkOutTime?: string;
  };
  assignedCleanersCount?: number;
  // LINE Bot 确认相关
  pendingCleanerAck?: boolean; // 是否存在“经理修改后待清洁工确认”的未确认
  fieldsChanged?: string[];    // 本次变更涉及关键字段
}

export interface TaskCapabilities {
  // 动作与可见性布尔
  canEditTaskMeta: boolean;
  canAssign: boolean;
  canOpenAssignmentModal: boolean;
  showAssignmentInfo: boolean;
  showAttendanceSummary: boolean;
  showAttendanceActions: boolean;
  showOwnAttendanceTimes: boolean;
  canUploadImages: boolean;
  canPostCleanNotes: boolean;
  canConfirmCompletion: boolean;
  showLockPassword: boolean;
  // 清洁工专用
  canAcceptTask: boolean;
  canRejectTask: boolean;
  showTaskAcceptance: boolean;
  // 经理专用
  canEditTaskDetails: boolean;
  canPublishTask: boolean;
  showTaskPublish: boolean;
  // LINE Bot 预留
  showAcknowledgementBanner: boolean;
  requiresCleanerAckOnManagerEdit: boolean;
  // 插槽区块（用于驱动卡片布局的显隐）
  visibleBlocks: string[];
}

const KEY_FIELDS = new Set([
  'checkInDate',
  'checkInTime',
  'lockPassword',
  'description',
  'specialInstructions'
]);

export function getTaskCapabilities(
  role: ViewerRole,
  status: TaskStatus,
  ctx: CapabilityContext = {}
): TaskCapabilities {
  const isAssignedCleaner = !!ctx.isAssignedCleaner;
  const hasAccepted = !!ctx.hasAccepted;
  const hasCheckIn = !!ctx.attendance?.hasCheckIn;
  const hasCheckOut = !!ctx.attendance?.hasCheckOut;
  const pendingCleanerAck = !!ctx.pendingCleanerAck;

  // 默认值
  let caps: TaskCapabilities = {
    canEditTaskMeta: false,
    canAssign: false,
    canOpenAssignmentModal: false,
    showAssignmentInfo: false,
    showAttendanceSummary: false,
    showAttendanceActions: false,
    showOwnAttendanceTimes: false,
    canUploadImages: false,
    canPostCleanNotes: false,
    canConfirmCompletion: false,
    showLockPassword: false,
    canAcceptTask: false,
    canRejectTask: false,
    showTaskAcceptance: false,
    canEditTaskDetails: false,
    canPublishTask: false,
    showTaskPublish: false,
    showAcknowledgementBanner: false,
    requiresCleanerAckOnManagerEdit: false,
    visibleBlocks: ['meta','status']
  };

  // 通用可见性
  if (status !== 'draft') {
    caps.showAssignmentInfo = true;
    if (!caps.visibleBlocks.includes('assignment')) caps.visibleBlocks.push('assignment');
  }

  // 角色与状态规则
  if (role === 'owner') {
    // 房东仅查看任务进度与附件，不编辑清扫任务（编辑/删除面向入住登记在前端单独实现）
    caps.canEditTaskDetails = false;
    caps.showLockPassword = false; // 房东不需要看密码
    
    // 房东只在任务被分配后才能看到清扫进程和清洁员信息
    if (status !== 'draft' && status !== 'open') {
      caps.showAssignmentInfo = true;
      if (!caps.visibleBlocks.includes('assignment')) caps.visibleBlocks.push('assignment');
      
      // 显示出勤汇总（只读）
      caps.showAttendanceSummary = true;
      if (!caps.visibleBlocks.includes('attendanceSummary')) caps.visibleBlocks.push('attendanceSummary');
      
      // 显示附件（只读）
      if (!caps.visibleBlocks.includes('attachments')) caps.visibleBlocks.push('attachments');
      if (status === 'confirmed') {
        if (!caps.visibleBlocks.includes('managerReport')) caps.visibleBlocks.push('managerReport');
      }
    }
  }

  if (role === 'manager') {
    if (status === 'draft') {
      // draft状态：经理可以编辑备注、确认清扫日期，并发布任务
      caps.canEditTaskMeta = true;
      caps.canEditTaskDetails = true;
      caps.canPublishTask = true;
      caps.showTaskPublish = true;
      if (!caps.visibleBlocks.includes('taskEdit')) caps.visibleBlocks.push('taskEdit');
      if (!caps.visibleBlocks.includes('taskPublish')) caps.visibleBlocks.push('taskPublish');
    } else if (status === 'open') {
      // open状态：经理可以分配清洁工，也可以编辑任务
      caps.canAssign = true;
      caps.canOpenAssignmentModal = true;
      caps.canEditTaskDetails = true;
      if (!caps.visibleBlocks.includes('assignmentAction')) caps.visibleBlocks.push('assignmentAction');
      if (!caps.visibleBlocks.includes('taskEdit')) caps.visibleBlocks.push('taskEdit');
    } else if (status === 'assigned' || status === 'accepted') {
      // 已分配状态：经理可以补/改分配，并且接受后仍可修改备注
      caps.canAssign = true; // 允许补/改分配
      caps.canOpenAssignmentModal = true;
      caps.canEditTaskDetails = true; // 接受后仍可修改备注
      if (!caps.visibleBlocks.includes('taskEdit')) caps.visibleBlocks.push('taskEdit');
      if (!caps.visibleBlocks.includes('assignmentAction')) caps.visibleBlocks.push('assignmentAction');
    }
    if (status === 'completed') {
      caps.canConfirmCompletion = true;
    }
    if (status === 'completed' || status === 'confirmed') {
      if (!caps.visibleBlocks.includes('cleanerNotes')) caps.visibleBlocks.push('cleanerNotes');
      if (!caps.visibleBlocks.includes('managerReport')) caps.visibleBlocks.push('managerReport');
    }
    // 出勤汇总与附件只读（经理）
    if (status !== 'draft') {
      caps.showAttendanceSummary = true;
      if (!caps.visibleBlocks.includes('attendanceSummary')) caps.visibleBlocks.push('attendanceSummary');
      if (!caps.visibleBlocks.includes('attachments')) caps.visibleBlocks.push('attachments');
    }
    caps.showLockPassword = true;

    // 接受后关键字段修改需清洁工确认（由外层在保存时计算 pendingCleanerAck）
    if (status === 'accepted' || status === 'in_progress' || status === 'completed') {
      const changed = (ctx.fieldsChanged || []).some(f => KEY_FIELDS.has(f));
      if (changed) {
        caps.requiresCleanerAckOnManagerEdit = true;
      }
    }
  }

  if (role === 'cleaner') {
    caps.showLockPassword = true;
    if (isAssignedCleaner) {
      if (status === 'assigned') {
        // 显示接受/拒绝任务按钮
        caps.canAcceptTask = true;
        caps.canRejectTask = true;
        caps.showTaskAcceptance = true;
        if (!caps.visibleBlocks.includes('taskAcceptance')) caps.visibleBlocks.push('taskAcceptance');
      }
      if (status === 'accepted' || status === 'in_progress') {
        caps.showAttendanceActions = true;
        if (!caps.visibleBlocks.includes('attendanceActions')) caps.visibleBlocks.push('attendanceActions');
      }
      if (status === 'accepted' || status === 'in_progress' || status === 'completed' || status === 'confirmed') {
        // 显示个人打卡时间（满足细节1）
        caps.showOwnAttendanceTimes = hasCheckIn || hasCheckOut;
        if (!caps.visibleBlocks.includes('attendanceTimes')) caps.visibleBlocks.push('attendanceTimes');
      }
      if (status === 'in_progress' || status === 'completed') {
        caps.canUploadImages = true;
        caps.canPostCleanNotes = true;
        if (!caps.visibleBlocks.includes('attachments')) caps.visibleBlocks.push('attachments');
        if (!caps.visibleBlocks.includes('notes')) caps.visibleBlocks.push('notes');
      }
    }
    // 待确认横幅（LINE 预留）
    if (pendingCleanerAck) {
      caps.showAcknowledgementBanner = true;
      if (!caps.visibleBlocks.includes('acknowledgement')) caps.visibleBlocks.push('acknowledgement');
    }
  }

  return caps;
}


