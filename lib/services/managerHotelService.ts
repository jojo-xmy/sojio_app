/**
 * 经理酒店管理服务
 * 
 * 管理经理与酒店的关联关系
 */

import { supabase } from '../supabase';

export interface ManagerHotel {
  id: string;
  managerId: string;
  hotelId: string;
  createdAt: string;
}

export interface Hotel {
  id: string;
  name: string;
  address: string;
  imageUrl?: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * 获取经理管理的所有酒店
 */
export async function getManagerHotels(managerId: string): Promise<Hotel[]> {
  try {
    const { data, error } = await supabase
      .from('manager_hotels')
      .select(`
        hotel_id,
        hotels:hotel_id (
          id,
          name,
          address,
          image_url,
          owner_id,
          created_at,
          updated_at
        )
      `)
      .eq('manager_id', managerId);

    if (error) {
      console.error('获取经理管理的酒店失败:', error);
      throw error;
    }

    return (data || [])
      .map((item: any) => item.hotels)
      .filter(Boolean)
      .map((hotel: any) => ({
        id: hotel.id,
        name: hotel.name,
        address: hotel.address,
        imageUrl: hotel.image_url,
        ownerId: hotel.owner_id,
        createdAt: hotel.created_at,
        updatedAt: hotel.updated_at
      }));
  } catch (error) {
    console.error('获取经理管理的酒店异常:', error);
    return [];
  }
}

/**
 * 获取系统中所有酒店
 */
export async function getAllHotels(): Promise<Hotel[]> {
  try {
    const { data, error } = await supabase
      .from('hotels')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('获取所有酒店失败:', error);
      throw error;
    }

    return (data || []).map((hotel: any) => ({
      id: hotel.id,
      name: hotel.name,
      address: hotel.address,
      imageUrl: hotel.image_url,
      ownerId: hotel.owner_id,
      createdAt: hotel.created_at,
      updatedAt: hotel.updated_at
    }));
  } catch (error) {
    console.error('获取所有酒店异常:', error);
    return [];
  }
}

/**
 * 添加经理管理的酒店
 */
export async function addManagerHotel(
  managerId: string,
  hotelId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('manager_hotels')
      .insert({
        manager_id: managerId,
        hotel_id: hotelId
      });

    if (error) {
      // 如果是唯一约束冲突，说明已经存在
      if (error.code === '23505') {
        return { success: false, error: '该酒店已在管理列表中' };
      }
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('添加经理管理的酒店失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '添加失败'
    };
  }
}

/**
 * 移除经理管理的酒店
 */
export async function removeManagerHotel(
  managerId: string,
  hotelId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('manager_hotels')
      .delete()
      .eq('manager_id', managerId)
      .eq('hotel_id', hotelId);

    if (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    console.error('移除经理管理的酒店失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '移除失败'
    };
  }
}

