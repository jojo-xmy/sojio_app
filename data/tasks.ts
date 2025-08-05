import { Task } from '@/types/task';

export const tasks: Task[] = [
  {
    id: '123',
    hotelName: 'Kyoto Villa',
    checkInTime: '15:00',
    date: '2025-06-09',
    assignedCleaners: ['Yamada Taro', 'Nguyen Linh'],
    status: '未打卡',
    description: '清扫3楼A房，重点卫生间和床单更换。',
    note: '请提前联系前台领取钥匙。',
    images: ['https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=200', 'https://images.unsplash.com/photo-1464983953574-0892a716854b?w=200'],
  },
  {
    id: '124',
    hotelName: 'Osaka Inn',
    checkInTime: '16:00',
    date: '2025-06-09',
    assignedCleaners: ['Yamada Taro'],
    status: '进行中',
    description: '清扫2楼B房，补充备品。',
    note: '',
    images: [],
  },
  {
    id: '125',
    hotelName: 'Tokyo Stay',
    checkInTime: '14:00',
    date: '2025-06-10',
    assignedCleaners: ['Nguyen Linh'],
    status: '已完成',
    description: '退房后全屋消毒。',
    note: '已上传照片。',
    images: ['https://images.unsplash.com/photo-1519125323398-675f0ddb6308?w=200'],
  },
]; 