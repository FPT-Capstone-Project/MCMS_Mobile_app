/** Vietnamese terms for the existing API stages; harvest readiness is separate. */
export const GROWTH_STAGE_LABELS = {
  FRUITING_INITIATION: 'Kích thích ra quả thể',
  PINNING: 'Hình thành mầm nấm',
  YOUNG_FRUITING: 'Quả thể non',
  MATURATION: 'Trưởng thành',
} as const;

export const GROWTH_STAGE_DESCRIPTIONS = {
  FRUITING_INITIATION: 'Tạo điều kiện để phôi bắt đầu hình thành quả thể; mầm nấm có thể chưa xuất hiện.',
  PINNING: 'Mầm quả thể nhỏ bắt đầu xuất hiện trên phôi, còn gọi là mầm nấm.',
  YOUNG_FRUITING: 'Quả thể còn non; cuống và mũ nấm tiếp tục phát triển.',
  MATURATION: 'Quả thể đạt giai đoạn trưởng thành; cần kiểm tra chất lượng trước khi xác nhận sẵn sàng thu hoạch.',
} as const;
