import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../src/features/auth';
import { AutomaticWizardScreen } from '../../src/features/iot';
import { AccessDeniedScreen } from '../../src/shared/components';

export default function CultivationScreen() {
  const router = useRouter();
  const { canControlIot, user } = useAuth();
  const params = useLocalSearchParams<{ sessionId?: string; floorId?: string; tab?: string }>();

  if (!canControlIot) {
    return (
      <AccessDeniedScreen
        featureName="Quản lý Phòng, Tầng & Khay"
        currentRole={user?.role || 'CUSTOMER'}
        requiredRoles={['ADMIN', 'FARM_OPERATOR']}
      />
    );
  }

  const initialFloorId = params.floorId ? Number(params.floorId) : undefined;
  const initialSessionId = params.sessionId ? Number(params.sessionId) : undefined;
  const defaultTab =
    params.tab === 'overview' || params.tab === 'logs' || params.tab === 'trays'
      ? params.tab
      : 'trays';

  return (
    <AutomaticWizardScreen
      initialFloorId={Number.isFinite(initialFloorId) ? initialFloorId : undefined}
      initialSessionId={Number.isFinite(initialSessionId) ? initialSessionId : undefined}
      defaultTab={defaultTab}
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)');
        }
      }}
    />
  );
}
