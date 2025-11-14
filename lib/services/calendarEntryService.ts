/**
 * 入住登记服务
 * 
 * 统一管理 calendar_entries 相关的所有操作
 * 这是任务创建的唯一切入点（通过数据库触发器自动创建任务）
 */

import { supabase } from '../supabase';
import { CalendarEntry, CreateCalendarEntryData } from '@/types/hotel';

/**
 * 将数据库字段（snake_case）映射为前端类型（camelCase）
 */
function mapCalendarEntryFromDB(row: any): CalendarEntry {
  return {
    id: row.id,
    hotelId: row.hotel_id,
    checkInDate: row.check_in_date,
    checkOutDate: row.check_out_date,
    guestCount: row.guest_count,
    ownerNotes: row.owner_notes || '',
    cleaningDates: row.cleaning_dates || [],
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * 将前端类型（camelCase）映射为数据库字段（snake_case）
 */
function mapCalendarEntryToDB(data: Partial<CreateCalendarEntryData>): any {
  const result: any = {};
  if (data.hotelId !== undefined) result.hotel_id = data.hotelId;
  if (data.checkInDate !== undefined) result.check_in_date = data.checkInDate;
  if (data.checkOutDate !== undefined) result.check_out_date = data.checkOutDate;
  if (data.guestCount !== undefined) result.guest_count = data.guestCount;
  if (data.ownerNotes !== undefined) result.owner_notes = data.ownerNotes;
  if (data.cleaningDates !== undefined) result.cleaning_dates = data.cleaningDates;
  return result;
}

/**
 * 获取酒店的所有入住登记
 */
export async function getHotelCalendarEntries(
  hotelId: string,
  startDate?: string,
  endDate?: string
): Promise<CalendarEntry[]> {
  try {
    let query = supabase
      .from('calendar_entries')
      .select('*')
      .eq('hotel_id', hotelId)
      .order('check_in_date', { ascending: true });

    if (startDate) {
      query = query.gte('check_in_date', startDate);
    }
    if (endDate) {
      query = query.lte('check_out_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('获取日历条目失败:', error);
      throw new Error(`获取日历条目失败: ${error.message}`);
    }

    return (data || []).map(mapCalendarEntryFromDB);
  } catch (error) {
    console.error('获取日历条目异常:', error);
    throw error;
  }
}

/**
 * 获取单个入住登记
 */
export async function getCalendarEntryById(entryId: string): Promise<CalendarEntry | null> {
  try {
    const { data, error } = await supabase
      .from('calendar_entries')
      .select('*')
      .eq('id', entryId)
      .single();

    if (error) {
      console.error('获取入住登记失败:', error);
      return null;
    }

    return mapCalendarEntryFromDB(data);
  } catch (error) {
    console.error('获取入住登记异常:', error);
    return null;
  }
}

/**
 * 同步入住登记的关键字段到所有关联任务
 * 
 * 当入住登记的某些字段（如 checkIn、checkOut、guestCount、ownerNotes 等）更新时，
 * 显式地将这些变更同步到所有关联的清扫任务中，保证数据一致性。
 */
async function syncCalendarEntryFieldsToTasks(
  entryId: string,
  updates: Partial<CreateCalendarEntryData>,
  updatedEntryRow: any
): Promise<void> {
  // 构建需要同步到任务的字段映射
  const taskUpdates: any = {};
  
  if (updates.checkInDate !== undefined) {
    taskUpdates.check_in_date = updatedEntryRow.check_in_date;
  }
  if (updates.checkOutDate !== undefined) {
    taskUpdates.check_out_date = updatedEntryRow.check_out_date;
  }
  if (updates.guestCount !== undefined) {
    taskUpdates.guest_count = updatedEntryRow.guest_count;
  }
  if (updates.ownerNotes !== undefined) {
    taskUpdates.owner_notes = updatedEntryRow.owner_notes;
  }

  // 如果没有需要同步的字段，直接返回
  if (Object.keys(taskUpdates).length === 0) {
    return;
  }

  console.log(`正在将入住登记 ${entryId} 的字段同步到关联任务:`, taskUpdates);

  // 更新所有关联任务
  const { error: syncError } = await supabase
    .from('tasks')
    .update(taskUpdates)
    .eq('calendar_entry_id', entryId);

  if (syncError) {
    console.error('同步字段到任务失败:', syncError);
    // 这里不抛出异常，避免阻塞入住登记的更新
    // 可根据业务需求调整是否需要严格同步
  } else {
    console.log(`成功同步字段到入住登记 ${entryId} 的所有关联任务`);
  }
}

/**
 * 创建入住登记
 * 
 * 重要：此函数通过数据库触发器自动创建清扫任务
 * 触发器会根据 cleaning_dates 数组创建对应数量的任务
 */
export async function createCalendarEntry(
  entryData: CreateCalendarEntryData,
  userId: string
): Promise<CalendarEntry> {
  try {
    const normalizedCleaningDates = (entryData.cleaningDates && entryData.cleaningDates.length > 0)
      ? entryData.cleaningDates
      : entryData.checkOutDate
        ? [entryData.checkOutDate]
        : [];

    const dbData = mapCalendarEntryToDB({
      ...entryData,
      cleaningDates: normalizedCleaningDates
    });
    dbData.created_by = userId;
    
    console.log('准备创建入住登记，数据:', dbData);

    const { data, error } = await supabase
      .from('calendar_entries')
      .insert(dbData)
      .select()
      .single();

    if (error) {
      console.error('创建入住登记失败:', error);
      console.error('错误详情:', JSON.stringify(error, null, 2));
      throw new Error(`创建入住登记失败: ${error.message || JSON.stringify(error)}`);
    }

    console.log('入住登记创建成功，触发器将自动创建清扫任务');
    return mapCalendarEntryFromDB(data);
  } catch (error) {
    console.error('创建入住登记异常:', error);
    throw error;
  }
}

/**
 * 更新入住登记
 *
 * 清扫任务在初次创建后独立维护。
 * 当清扫日期发生变化时，仅对新增日期创建任务，对移除日期删除仍处于 draft/open 的任务。
 * 同时，会将入住登记的关键字段（如 checkIn/checkOut、guestCount、ownerNotes）同步到所有关联任务。
 */
export async function updateCalendarEntry(
  entryId: string,
  updates: Partial<CreateCalendarEntryData>
): Promise<CalendarEntry> {
  const shouldSyncCleaningDates = Array.isArray(updates.cleaningDates);
  const deletableStatuses = new Set(['draft', 'open']);

  let originalEntry: any | null = null;
  let existingTasks: Array<{ id: string; cleaning_date: string; status: string }>
    = [];
  let addedDates: string[] = [];
  let removedDates: string[] = [];
  const createdTaskIds: string[] = [];
  let desiredCleaningDates: string[] | undefined;

  try {
    if (shouldSyncCleaningDates) {
      const { data: currentEntry, error: currentEntryError } = await supabase
        .from('calendar_entries')
        .select('id, hotel_id, check_in_date, check_out_date, guest_count, owner_notes, created_by, cleaning_dates')
        .eq('id', entryId)
        .single();

      if (currentEntryError || !currentEntry) {
        console.error('获取入住登记失败:', currentEntryError);
        throw new Error('获取入住登记失败，无法更新清扫日期');
      }

      originalEntry = currentEntry;

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, cleaning_date, status')
        .eq('calendar_entry_id', entryId);

      if (tasksError) {
        console.error('获取关联任务失败:', tasksError);
        throw new Error('获取关联任务失败，无法更新清扫日期');
      }

      existingTasks = tasksData || [];

      const baseCheckOutDate = updates.checkOutDate ?? currentEntry.check_out_date;
      desiredCleaningDates = (updates.cleaningDates && updates.cleaningDates.length > 0)
        ? updates.cleaningDates
        : baseCheckOutDate
          ? [baseCheckOutDate]
          : (currentEntry.cleaning_dates || []);

      const currentDates = new Set<string>((currentEntry.cleaning_dates || []).map((d: string) => d));
      const nextDates = new Set<string>(desiredCleaningDates!.map(d => d));

      addedDates = [...nextDates].filter(date => !currentDates.has(date));
      removedDates = [...currentDates].filter(date => !nextDates.has(date));

      if (removedDates.length > 0) {
        const blockedTasks = existingTasks.filter(task =>
          removedDates.includes(task.cleaning_date) && !deletableStatuses.has(task.status)
        );

        if (blockedTasks.length > 0) {
          throw new Error(
            `以下清扫任务已在执行流程中，无法移除清扫日期：${blockedTasks
              .map(task => task.cleaning_date)
              .join(', ')}`
          );
        }
      }
    }

    const dbData = mapCalendarEntryToDB({
      ...updates,
      cleaningDates: shouldSyncCleaningDates
        ? desiredCleaningDates
        : undefined
    });

    const { data, error } = await supabase
      .from('calendar_entries')
      .update(dbData)
      .eq('id', entryId)
      .select()
      .single();

    if (error) {
      console.error('更新入住登记失败:', error);
      throw new Error(`更新入住登记失败: ${error.message}`);
    }

    const updatedEntryRow = data;

    if (shouldSyncCleaningDates && originalEntry) {
      // 创建新增的任务
      if (addedDates.length > 0) {
        const { data: hotelRow, error: hotelError } = await supabase
          .from('hotels')
          .select('id, name, address')
          .eq('id', updatedEntryRow.hotel_id)
          .single();

        if (hotelError || !hotelRow) {
          console.error('获取酒店信息失败:', hotelError);
          throw new Error('获取酒店信息失败，无法创建新的清扫任务');
        }

        const tasksToInsert = addedDates.map(date => ({
          hotel_name: hotelRow.name,
          hotel_address: hotelRow.address || null,
          hotel_id: updatedEntryRow.hotel_id,
          check_in_date: updatedEntryRow.check_in_date,
          check_out_date: updatedEntryRow.check_out_date,
          cleaning_date: date,
          guest_count: updatedEntryRow.guest_count,
          status: 'draft',
          created_by: updatedEntryRow.created_by,
          owner_notes: updatedEntryRow.owner_notes,
          calendar_entry_id: updatedEntryRow.id
        }));

        const { data: insertedTasks, error: insertError } = await supabase
          .from('tasks')
          .insert(tasksToInsert)
          .select('id');

        if (insertError) {
          console.error('创建新的清扫任务失败:', insertError);
          throw new Error('创建新的清扫任务失败，请稍后重试');
        }

        if (insertedTasks) {
          createdTaskIds.push(...insertedTasks.map(task => task.id));
        }
      }

      // 删除需要移除的任务
      if (removedDates.length > 0) {
        const taskIdsToDelete = existingTasks
          .filter(task => removedDates.includes(task.cleaning_date))
          .map(task => task.id);

        if (taskIdsToDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('tasks')
            .delete()
            .in('id', taskIdsToDelete);

          if (deleteError) {
            console.error('删除清扫任务失败:', deleteError);
            throw new Error('删除清扫任务失败，请稍后重试');
          }
        }
      }
    }

    // 显式同步入住登记的关键字段到所有关联任务
    // （即使没有更新 cleaning_dates，也要同步其他字段的变更）
    await syncCalendarEntryFieldsToTasks(entryId, updates, updatedEntryRow);

    return mapCalendarEntryFromDB(updatedEntryRow);
  } catch (error) {
    console.error('更新入住登记异常:', error);

    // 如果失败且尝试更新过清扫日期，则回滚清扫日期到原始值
    if (shouldSyncCleaningDates && originalEntry) {
      await supabase
        .from('calendar_entries')
        .update({ cleaning_dates: originalEntry.cleaning_dates })
        .eq('id', entryId);

      if (createdTaskIds.length > 0) {
        const { error: rollbackTaskError } = await supabase
          .from('tasks')
          .delete()
          .in('id', createdTaskIds);

        if (rollbackTaskError) {
          console.error('回滚新增清扫任务失败:', rollbackTaskError);
        }
      }
    }

    throw error;
  }
}

/**
 * 删除入住登记
 * 
 * 重要：删除入住登记后，触发器会自动删除关联的清扫任务
 */
export async function deleteCalendarEntry(entryId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('calendar_entries')
      .delete()
      .eq('id', entryId);

    if (error) {
      console.error('删除入住登记失败:', error);
      throw new Error(`删除入住登记失败: ${error.message}`);
    }

    console.log('入住登记已删除，关联的清扫任务已自动清理');
  } catch (error) {
    console.error('删除入住登记异常:', error);
    throw error;
  }
}

/**
 * 通过任务ID查询对应的入住登记
 */
export async function getCalendarEntryByTaskId(taskId: string): Promise<CalendarEntry | null> {
  try {
    // 读取任务，确保有 calendar_entry_id
    const { data: taskRow, error: taskError } = await supabase
      .from('tasks')
      .select('calendar_entry_id')
      .eq('id', taskId)
      .maybeSingle();

    if (taskError || !taskRow || !taskRow.calendar_entry_id) return null;

    const { data, error } = await supabase
      .from('calendar_entries')
      .select('*')
      .eq('id', taskRow.calendar_entry_id)
      .maybeSingle();

    if (error) return null;
    return data ? mapCalendarEntryFromDB(data) : null;
  } catch (error) {
    console.error('通过任务ID获取入住登记异常:', error);
    return null;
  }
}

