import React from 'react';
import { useAuth } from '../../src/features/auth';
import { ControlCenterScreen } from '../../src/features/iot';
import { AccessDeniedScreen } from '../../src/shared/components';

export default function ControlRoute() {
  const { canControlIot, user } = useAuth();

  if (!canControlIot) {
    return (
      <AccessDeniedScreen
        featureName="Điều khiển Van & Đèn GPIO6"
        currentRole={user?.role || 'CUSTOMER'}
        requiredRoles={['ADMIN', 'FARM_OPERATOR']}
      />
    );
  }

  return <ControlCenterScreen />;
}
