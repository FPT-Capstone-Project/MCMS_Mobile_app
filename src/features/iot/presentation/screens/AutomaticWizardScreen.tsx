import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../auth';
import { iotRepository } from '../../data/repositories/IotRepository';
import { FloorMapping } from '../../domain/entities/Iot';
import { FloorListScreen } from './FloorListScreen';
import { FloorDetailScreen } from './FloorDetailScreen';

export interface AutomaticWizardScreenProps {
  initialFloorId?: number;
  defaultTab?: 'overview' | 'trays' | 'logs';
  onBack?: () => void;
}

export const AutomaticWizardScreen: React.FC<AutomaticWizardScreenProps> = ({
  initialFloorId,
  defaultTab = 'overview',
  onBack,
}) => {
  const { canControlIot } = useAuth();
  const [selectedFloor, setSelectedFloor] = useState<FloorMapping | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'trays' | 'logs'>(defaultTab);

  // Auto-resolve and select initialFloorId if provided
  useEffect(() => {
    if (initialFloorId && !selectedFloor) {
      let isMounted = true;
      iotRepository
        .getFloors()
        .then((floors) => {
          if (!isMounted) return;
          const targetId = Number(initialFloorId);
          const found = floors.find(
            (f) =>
              Number(f.floor_id) === targetId ||
              Number(f.id) === targetId ||
              Number(f.floor_number) === targetId
          );
          if (found) {
            setSelectedFloor(found);
            setActiveTab(defaultTab);
          }
        })
        .catch(() => {});

      return () => {
        isMounted = false;
      };
    }
  }, [initialFloorId, defaultTab, selectedFloor]);

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
