import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { theme } from '../../../../core/theme';
import { AppText } from '../../../../shared/components/primitives/AppText';
import { RentalStep } from '../../domain/entities/Rental';

export interface RentalStepIndicatorProps {
  currentStep: RentalStep;
}

interface StepMeta {
  key: RentalStep;
  stepNumber: number;
  label: string;
}

const STEPS: StepMeta[] = [
  { key: 'SELECT_TRAY', stepNumber: 1, label: 'Chọn khay' },
  { key: 'SELECT_DURATION', stepNumber: 2, label: 'Thời gian' },
  { key: 'SELECT_MUSHROOM', stepNumber: 3, label: 'Phôi nấm' },
  { key: 'CONFIRM_SUMMARY', stepNumber: 4, label: 'Xác nhận' },
];

export const RentalStepIndicator: React.FC<RentalStepIndicatorProps> = ({ currentStep }) => {
  const currentStepIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <View style={styles.container}>
      <View style={styles.stepsRow}>
        {STEPS.map((step, index) => {
          const isDone = index < currentStepIndex;
          const isCurrent = index === currentStepIndex;

          return (
            <React.Fragment key={step.key}>
              {/* Step Circle + Label */}
              <View style={styles.stepItem}>
                <View
                  style={[
                    styles.circle,
                    isDone && styles.circleDone,
                    isCurrent && styles.circleCurrent,
                  ]}
                >
                  {isDone ? (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  ) : (
                    <AppText
                      variant="caption"
                      weight="bold"
                      color={isCurrent ? '#FFFFFF' : theme.colors.neutral[500]}
                    >
                      {step.stepNumber}
                    </AppText>
                  )}
                </View>
                <AppText
                  variant="caption"
                  weight={isCurrent ? 'bold' : 'regular'}
                  color={
                    isCurrent
                      ? theme.colors.primary[700]
                      : isDone
                      ? theme.colors.text.primary
                      : theme.colors.text.muted
                  }
                  style={styles.label}
                  numberOfLines={1}
                >
                  {step.label}
                </AppText>
              </View>

              {/* Connecting line */}
              {index < STEPS.length - 1 && (
                <View
                  style={[
                    styles.line,
                    index < currentStepIndex && styles.lineDone,
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background.paper,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.light,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
    minWidth: 60,
  },
  circle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCurrent: {
    backgroundColor: theme.colors.primary[500],
  },
  circleDone: {
    backgroundColor: theme.colors.primary[600],
  },
  label: {
    fontSize: 11,
    textAlign: 'center',
  },
  line: {
    flex: 1,
    height: 2,
    backgroundColor: theme.colors.neutral[200],
    marginHorizontal: 2,
    marginBottom: 16,
  },
  lineDone: {
    backgroundColor: theme.colors.primary[500],
  },
});
