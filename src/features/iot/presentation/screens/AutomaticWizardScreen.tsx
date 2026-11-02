import React, { useState } from 'react';
import { useAuth } from '../../../auth';
import { FloorMapping } from '../../domain/entities/Iot';
import { FloorListScreen } from './FloorListScreen';
import { FloorDetailScreen } from './FloorDetailScreen';

export interface AutomaticWizardScreenProps {
  initialFloorId?: number;
  defaultTab?: 'overview' | 'trays' | 'logs';
  onBack?: () => void;
}

export const AutomaticWizardScreen: React.FC<AutomaticWizardScreenProps> = ({
  defaultTab = 'overview',
  onBack,
}) => {
  const { canControlIot } = useAuth();
  const [selectedFloor, setSelectedFloor] = useState<FloorMapping | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'trays' | 'logs'>(defaultTab);

  if (selectedFloor) {
    return (
      <FloorDetailScreen
        floor={selectedFloor}
        initialTab={activeTab}
        onBack={() => setSelectedFloor(null)}
        canManage={canControlIot}
      />
    );
  }

  return (
    <FloorListScreen
      canManage={canControlIot}
      onSelectFloor={(floor, tab) => {
        setSelectedFloor(floor);
        setActiveTab(tab || defaultTab);
      }}
      onBack={onBack}
    />
  );
};

export default AutomaticWizardScreen;
