import React from 'react';
import { useAuth } from '../src/features/auth';
import { AccessDeniedScreen } from '../src/shared/components';
import { OperatorExpertScreen } from '../src/features/expert/presentation/OperatorExpertScreen';
export default function ExpertSupportRoute() {
  const { isAdmin, isFarmOperator, user } = useAuth();
  if (!isAdmin && !isFarmOperator)
    return (
      <AccessDeniedScreen
        featureName="Làm việc với chuyên gia"
        currentRole={user?.role || 'CUSTOMER'}
        requiredRoles={['ADMIN', 'FARM_OPERATOR']}
      />
    );
  return <OperatorExpertScreen />;
}
