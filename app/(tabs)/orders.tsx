import React from 'react';
import { AdminOrdersScreen } from '../../src/features/order';
import { CustomerSessionsScreen } from '../../src/features/order/presentation/screens/CustomerSessionsScreen';
import { useAuth } from '../../src/features/auth';

export default function OrdersScreen() {
  const { user } = useAuth();

  if (user?.role === 'ADMIN' || user?.role === 'FARM_OPERATOR') {
    return <AdminOrdersScreen />;
  }

  return <CustomerSessionsScreen />;
}
