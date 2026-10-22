/**
 * Cultivation Domain Entities
 * Reflects backend OpenAPI schema for Rooms, Trays, Mushroom Types, and Conditions.
 */

export interface CultivationRoom {
  room_id: number;
  room_code: string;
  room_name: string;
  description: string | null;
  capacity: number;
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
  created_at?: string;
  updated_at?: string;
}

export interface CultivationTray {
  tray_id: number;
  room_id: number;
  tray_code: string;
  tray_name: string | null;
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE';
  created_at?: string;
  updated_at?: string;
}

export interface MushroomType {
  mushroom_type_id: number;
  name: string;
  description: string | null;
  growing_days: number;
  price: number;
  image_url: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  created_at?: string;
}

export interface MushroomCondition {
  condition_id: number;
  mushroom_type_id: number;
  temperature_min: number | null;
  temperature_max: number | null;
  humidity_min: number | null;
  humidity_max: number | null;
  co2_min: number | null;
  co2_max: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateMushroomConditionRequest {
  mushroomTypeId: number;
  temperatureMin?: number | null;
  temperatureMax?: number | null;
  humidityMin?: number | null;
  humidityMax?: number | null;
  co2Min?: number | null;
  co2Max?: number | null;
}

export interface UpdateMushroomConditionRequest {
  mushroomTypeId?: number;
  temperatureMin?: number | null;
  temperatureMax?: number | null;
  humidityMin?: number | null;
  humidityMax?: number | null;
  co2Min?: number | null;
  co2Max?: number | null;
}


