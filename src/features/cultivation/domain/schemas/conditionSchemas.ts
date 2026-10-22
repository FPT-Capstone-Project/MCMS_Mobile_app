import { z } from 'zod';

/**
 * Zod validation schema for creating mushroom conditions (POST /api/mushroom-conditions)
 */
export const createMushroomConditionSchema = z
  .object({
    mushroomTypeId: z.number({
      message: 'Vui lòng chọn loại nấm.',
    }).int().positive('ID loại nấm không hợp lệ.'),

    temperatureMin: z.number().nullable().optional(),
    temperatureMax: z.number().nullable().optional(),

    humidityMin: z
      .number()
      .min(0, 'Độ ẩm không khí tối thiểu từ 0%')
      .max(100, 'Độ ẩm không khí tối đa đến 100%')
      .nullable()
      .optional(),
    humidityMax: z
      .number()
      .min(0, 'Độ ẩm không khí tối thiểu từ 0%')
      .max(100, 'Độ ẩm không khí tối đa đến 100%')
      .nullable()
      .optional(),

    co2Min: z
      .number()
      .min(0, 'Nồng độ CO₂ phải >= 0 ppm')
      .nullable()
      .optional(),
    co2Max: z
      .number()
      .min(0, 'Nồng độ CO₂ phải >= 0 ppm')
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      if (data.temperatureMin != null && data.temperatureMax != null) {
        return data.temperatureMin <= data.temperatureMax;
      }
      return true;
    },
    {
      message: 'Nhiệt độ tối thiểu không được lớn hơn nhiệt độ tối đa.',
      path: ['temperatureMin'],
    }
  )
  .refine(
    (data) => {
      if (data.humidityMin != null && data.humidityMax != null) {
        return data.humidityMin <= data.humidityMax;
      }
      return true;
    },
    {
      message: 'Độ ẩm không khí tối thiểu không được lớn hơn tối đa.',
      path: ['humidityMin'],
    }
  )
  .refine(
    (data) => {
      if (data.co2Min != null && data.co2Max != null) {
        return data.co2Min <= data.co2Max;
      }
      return true;
    },
    {
      message: 'Nồng độ CO₂ tối thiểu không được lớn hơn tối đa.',
      path: ['co2Min'],
    }
  );

export type CreateMushroomConditionFormData = z.infer<typeof createMushroomConditionSchema>;

/**
 * Zod validation schema for updating mushroom conditions (PUT /api/mushroom-conditions/:id)
 */
export const updateMushroomConditionSchema = createMushroomConditionSchema.partial();
export type UpdateMushroomConditionFormData = z.infer<typeof updateMushroomConditionSchema>;
