import React from 'react';
import { useAuth } from '../../src/features/auth';
import { ManualSsrControlScreen } from '../../src/features/iot';
import { AccessDeniedScreen } from '../../src/shared/components';

export default function ManualControlRoute() {
  const { canControlIot, user } = useAuth();

  if (!canControlIot) {
    return (
      <AccessDeniedScreen
        featureName="Điều khiển SSR 8 kênh thủ công"
        currentRole={user?.role || 'CUSTOMER'}
        requiredRoles={['ADMIN', 'FARM_OPERATOR']}
      />
    );
  }

  return <ManualSsrControlScreen />;
}
