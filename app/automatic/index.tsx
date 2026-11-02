import { useRouter } from 'expo-router';
import React from 'react';
import { useAuth } from '../../src/features/auth';
import { AutomaticWizardScreen } from '../../src/features/iot';
import { AccessDeniedScreen } from '../../src/shared/components';

export default function AutomaticRoute() {
  const router = useRouter();
  const { canControlIot, user } = useAuth();

  if (!canControlIot) {
    return (
      <AccessDeniedScreen
        featureName="Thiết lập Phun sương Tự động"
        currentRole={user?.role || 'CUSTOMER'}
        requiredRoles={['ADMIN', 'FARM_OPERATOR']}
      />
    );
  }

  return (
    <AutomaticWizardScreen
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
