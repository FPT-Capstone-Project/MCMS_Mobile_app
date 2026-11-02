import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../src/features/auth';
import { AutomaticWizardScreen } from '../../src/features/iot';
import { AccessDeniedScreen } from '../../src/shared/components';

export default function CultivationScreen() {
  const router = useRouter();
  const { canControlIot, user } = useAuth();

  if (!canControlIot) {
    return (
      <AccessDeniedScreen
        featureName="Quản lý Phòng, Tầng & Khay"
        currentRole={user?.role || 'CUSTOMER'}
        requiredRoles={['ADMIN', 'FARM_OPERATOR']}
      />
    );
  }

  return (
    <AutomaticWizardScreen
      defaultTab="trays"
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
