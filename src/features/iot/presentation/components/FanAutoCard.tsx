import React from 'react';
import { AppCard, AppText } from '../../../../shared/components';
import { AutoControlStatus } from '../../domain/entities/Iot';
import { FAN_AUTO_LABELS } from '../../domain/entities/FanAuto';

export function FanAutoCard({ status }: { status?: AutoControlStatus | null }) {
  const fan = status?.fan;
  if (!fan || (!fan.enabled && fan.state === 'STOPPED')) return null;
  return <AppCard>
    <AppText weight="bold">Quạt trong AUTO: {FAN_AUTO_LABELS[fan.state]}</AppText>
    <AppText>Chạy {fan.runMinutes} phút · Nghỉ {fan.restMinutes} phút</AppText>
    {fan.remainingMs > 0 && <AppText>Còn khoảng {Math.ceil(fan.remainingMs / 60000)} phút</AppText>}
    {fan.lastError && <AppText>{fan.lastError}</AppText>}
    <AppText variant="caption">Dùng nút dừng AUTO của tầng để dừng cả phun sương và quạt.</AppText>
  </AppCard>;
}
