import { Task } from './task';

// Gantt 任务项
export interface GanttTask {
  id: string;
  text: string;
  start_date: string;
  end_date: string;
  progress: number;
  color?: string;
  parent?: string;
  type?: 'task' | 'milestone';
  open?: boolean;
  // 自定义字段
  taskData?: Task;
  taskType?: 'checkin' | 'cleaning';
  status?: string;
}

// Gantt 链接
export interface GanttLink {
  id: string;
  source: string;
  target: string;
  type: string;
}

// Gantt 配置
export interface GanttConfig {
  header_height: number;
  column_width: number;
  step: number;
  view_modes: string[];
  bar_height: number;
  date_format: string;
  language: string;
  readonly?: boolean;
  select_task?: boolean;
  show_progress?: boolean;
  show_critical_path?: boolean;
  show_links?: boolean;
}

