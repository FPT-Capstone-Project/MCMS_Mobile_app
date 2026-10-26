import { z } from 'zod';

/**
 * Base raw object schema for mushroom condition fields
 */
export const mushroomConditionBaseSchema = z.object({
  mushroomTypeId: z
    .number({
      message: 'Vui lòng chọn loại nấm.',
    })
    .int()
    .positive('ID loại nấm không hợp lệ.'),

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
});

interface ConditionMinMaxFields {
  temperatureMin?: number | null;
  temperatureMax?: number | null;
  humidityMin?: number | null;
  humidityMax?: number | null;
}

/**
 * Helper to apply range checks (min <= max) to any condition schema
 */
const applyConditionRefinements = <T extends z.ZodType<ConditionMinMaxFields>>(schema: T) =>
  schema
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
    );

/**
 * Zod validation schema for creating mushroom conditions (POST /api/mushroom-conditions)
 */
export const createMushroomConditionSchema = applyConditionRefinements(
  mushroomConditionBaseSchema
);
export type CreateMushroomConditionFormData = z.infer<typeof createMushroomConditionSchema>;

/**
 * Zod validation schema for updating mushroom conditions (PUT /api/mushroom-conditions/:id)
 * Calling .partial() on the base ZodObject BEFORE applying refinements
 */
export const updateMushroomConditionSchema = applyConditionRefinements(
  mushroomConditionBaseSchema.partial()
);
export type UpdateMushroomConditionFormData = z.infer<typeof updateMushroomConditionSchema>;
