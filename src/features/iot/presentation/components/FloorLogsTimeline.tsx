import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../../../core/theme';
import { AutoControlLogItem } from '../../domain/entities/Iot';
import {
  AppButton,
  AppCard,
  AppText,
} from '../../../../shared/components';
import { formatMistingCode } from '../../utils/mistingI18n';

interface FloorLogsTimelineProps {
  logs: AutoControlLogItem[];
  loadingMore?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

export const FloorLogsTimeline: React.FC<FloorLogsTimelineProps> = ({
  logs,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
}) => {
  const [expandedLogIds, setExpandedLogIds] = useState<number[]>([]);

  const toggleExpand = (id: number) => {
    setExpandedLogIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const formatLogTime = (timeStr?: string) => {
    if (!timeStr) return '--:--';
    try {
      const d = new Date(timeStr);
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      const secs = String(d.getSeconds()).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      return `${hours}:${mins}:${secs} · ${day}/${month}`;
    } catch {
      return timeStr;
    }
  };

  const getEventBadgeColor = (eventType: string) => {
    switch (eventType) {
      case 'ON_REQUESTED':
        return theme.colors.primary[600];
      case 'OFF_REQUESTED':
        return theme.colors.warning.main;
      case 'OFF_CONFIRMED':
        return theme.colors.success.main;
      case 'FAULT':
      case 'OFF_FAILED':
        return theme.colors.error.main;
      case 'START':
        return '#0284C7';
      case 'STOP':
      case 'MANUAL_OVERRIDE':
        return theme.colors.neutral[600];
      default:
        return theme.colors.neutral[500];
    }
  };

  if (logs.length === 0) {
    return (
      <AppCard elevation="xs" style={styles.emptyCard}>
        <Ionicons name="newspaper-outline" size={36} color={theme.colors.text.muted} />
        <AppText variant="bodySmall" color={theme.colors.text.muted} align="center" style={{ marginTop: 6 }}>
          Chưa có nhật ký điều khiển tự động cho tầng này.
        </AppText>
      </AppCard>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.timelineList}>
        {logs.map((log, index) => {
          const logId = log.id ?? index;
          const isExpanded = expandedLogIds.includes(logId);
          const badgeColor = getEventBadgeColor(log.event_type);
          const eventLabel = formatMistingCode('eventType', log.event_type);

          return (
            <View key={`log_${logId}_${index}`} style={styles.timelineItem}>
              {/* Left Timeline Line & Dot */}
              <View style={styles.leftLineCol}>
                <View style={[styles.timelineDot, { backgroundColor: badgeColor }]} />
                {index < logs.length - 1 && <View style={styles.timelineLine} />}
              </View>

              {/* Log Content Card */}
              <Pressable
                onPress={() => toggleExpand(logId)}
                style={styles.logCard}
              >
                {/* Header: Time + Event Badge */}
                <View style={styles.logHeader}>
                  <View style={[styles.eventBadge, { backgroundColor: `${badgeColor}18` }]}>
                    <AppText
                      variant="caption"
                      weight="bold"
                      color={badgeColor}
                      style={{ fontSize: 10 }}
                    >
                      {eventLabel}
                    </AppText>
                  </View>

                  <AppText variant="caption" color={theme.colors.text.secondary} style={{ fontSize: 11 }}>
                    {formatLogTime(log.timestamp || log.created_at)}
                  </AppText>
                </View>

                {/* Reason Text */}
                <AppText variant="bodySmall" color={theme.colors.text.primary} style={styles.reasonText}>
                  {log.reason}
                </AppText>

                {/* Telemetry snippet at event time */}
                {(log.average_humidity != null || log.average_temperature != null) && (
                  <View style={styles.metricsSnippet}>
                    {log.average_humidity != null && (
                      <AppText variant="caption" color={theme.colors.text.secondary} style={{ fontSize: 10 }}>
                        Độ ẩm: <AppText variant="caption" weight="semibold">{log.average_humidity}%</AppText>
                      </AppText>
                    )}
                    {log.average_temperature != null && (
                      <AppText variant="caption" color={theme.colors.text.secondary} style={{ fontSize: 10 }}>
                        • Nhiệt độ: <AppText variant="caption" weight="semibold">{log.average_temperature}°C</AppText>
                      </AppText>
                    )}
                  </View>
                )}

                {/* Technical details toggle */}
                {isExpanded && (
                  <View style={styles.technicalBox}>
                    <AppText variant="caption" color={theme.colors.text.muted} style={{ fontSize: 10 }}>
                      Mã sự kiện: {log.event_type}
                    </AppText>
                    {log.run_id != null && (
                      <AppText variant="caption" color={theme.colors.text.muted} style={{ fontSize: 10 }}>
                        Phiên chạy (Run ID): #{log.run_id}
                      </AppText>
                    )}
                    {log.floor_id != null && (
                      <AppText variant="caption" color={theme.colors.text.muted} style={{ fontSize: 10 }}>
                        Tầng ID: #{log.floor_id}
                      </AppText>
                    )}
                  </View>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* Pagination Load More */}
      {hasMore && (
        <View style={styles.loadMoreRow}>
          {loadingMore ? (
            <ActivityIndicator size="small" color={theme.colors.primary[600]} />
          ) : (
            <AppButton
              title="Tải thêm nhật ký (30 mục tiếp theo)"
              variant="outline"
              size="sm"
              onPress={onLoadMore}
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  timelineList: {
    gap: 0,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  leftLineCol: {
    alignItems: 'center',
    width: 16,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 6,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: theme.colors.neutral[200],
    marginVertical: 2,
  },
  logCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border.light,
    padding: theme.spacing.sm,
    marginBottom: 8,
    gap: 3,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reasonText: {
    lineHeight: 18,
    marginTop: 2,
  },
  metricsSnippet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  technicalBox: {
    backgroundColor: theme.colors.neutral[50],
    borderRadius: 4,
    padding: 6,
    marginTop: 4,
    gap: 2,
  },
  loadMoreRow: {
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
  },
  emptyCard: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    backgroundColor: '#FFFFFF',
  },
});

