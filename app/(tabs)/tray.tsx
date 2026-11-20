import { AppAlert as Alert, AppModal as Modal } from '../../src/shared/components/feedback/AppDialog';
import { TrayMushroomImage } from '../../src/features/iot/presentation/components/TrayMushroomImage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { AppError } from '../../src/core/errors/appError';
import { theme } from '../../src/core/theme';
import {
  AppButton,
  AppCard,
  AppHeader,
  AppIconButton,
  AppText,
  ScreenContainer,
} from '../../src/shared/components';
import {
  CustomerFloorRack,
  CustomerTrayCard,
} from '../../src/features/tray';
import { trayRepository } from '../../src/features/tray/data/repositories/TrayRepository';
import { CustomerTrayDetail } from '../../src/features/tray/presentation/components/CustomerTrayDetail';
import { useAuth } from '../../src/features/auth';
import {
  CultivationSessionAdmin,
  iotRepository,
  AssignSessionModal,
} from '../../src/features/iot';
import {
  DailyTrayInspectionHistoryModal,
  DailyTrayInspectionModal,
  cultivationRepository,
} from '../../src/features/cultivation';

type TrayLoadState = 'loading' | 'ready' | 'error';

function getErrorMessage(error: unknown, fallback = 'Không thể tải sơ đồ khay.'): string {
  if (error instanceof AppError) return error.message;
  return error instanceof Error ? error.message : fallback;
}

function isSameDay(dateStr?: string | null): boolean {
  if (!dateStr) return false;
  const todayVN = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  if (typeof dateStr === 'string' && dateStr.slice(0, 10) === todayVN) {
    return true;
  }
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const dVN = d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
  return dVN === todayVN;
}

export default function TrayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string; floorId?: string }>();
  const { canControlIot } = useAuth();
  const [cleaningTrayId, setCleaningTrayId] = useState<number | null>(null);
  const cleaningInFlight = useRef(false);


  const [racks, setRacks] = useState<CustomerFloorRack[]>([]);
  const [loadState, setLoadState] = useState<TrayLoadState>('loading');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tray Details Modal state
  const [selectedTray, setSelectedTray] = useState<CustomerTrayCard | null>(null);
  // Staff Assign Trays workflow state
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assigningSession, setAssigningSession] = useState<CultivationSessionAdmin | null>(null);
  const [selectedFloorIdForAssign, setSelectedFloorIdForAssign] = useState<number | null>(null);
  const [selectedTrayIdsForAssign, setSelectedTrayIdsForAssign] = useState<number[]>([]);
  const [assignSubmitting, setAssignSubmitting] = useState(false);
  const [availableTrayIdsByFloor, setAvailableTrayIdsByFloor] = useState<Map<number, Set<number>>>(new Map());

  // Daily Inspection workflow state
  const [cultivatingSessionsMap, setCultivatingSessionsMap] = useState<Map<number, CultivationSessionAdmin>>(new Map());
  const [inspectedSessionTrayIdsToday, setInspectedSessionTrayIdsToday] = useState<Set<number>>(new Set());
  const [inspectedTrayIdsToday, setInspectedTrayIdsToday] = useState<Set<number>>(new Set());
  const [dailyReportSession, setDailyReportSession] = useState<CultivationSessionAdmin | null>(null);
  const [dailyReportSessionTrayId, setDailyReportSessionTrayId] = useState<number | null>(null);
  const [dailyModalVisible, setDailyModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);

  const loadRacks = useCallback(async () => {
    try {
      setErrorMessage(null);
      const loadedRacks = await trayRepository.getCustomerFloorRacks();
      setRacks(loadedRacks);

      if (canControlIot) {
        try {
          const [cultivatingSessions, allAdminSessions] = await Promise.all([
            iotRepository.getAdminCultivationSessions('CULTIVATING'),
            iotRepository.getAdminCultivationSessions(),
          ]);

          const cMap = new Map<number, CultivationSessionAdmin>();
          allAdminSessions.forEach((s) => {
            if (s.session_id) cMap.set(s.session_id, s);
          });
          cultivatingSessions.forEach((s) => {
            if (s.session_id) cMap.set(s.session_id, s);
          });

          // Check all sessionIds that appear on the racks
          const sessionIdsOnRacks = new Set<number>();
          loadedRacks.forEach((rack) => {
            rack.trays.forEach((tray) => {
              if (tray.sessionId) sessionIdsOnRacks.add(tray.sessionId);
            });
          });

          const sessionsToFetch = Array.from(sessionIdsOnRacks);
          const historyResults = await Promise.allSettled(
            sessionsToFetch.map((sId) => cultivationRepository.getDailyInspectionHistory(sId, 1, 30))
          );

          const reportedSessionTrays = new Set<number>();
          const reportedTrays = new Set<number>();

          historyResults.forEach((res) => {
            if (res.status === 'fulfilled' && Array.isArray(res.value?.inspections)) {
              res.value.inspections.forEach((insp) => {
                if (isSameDay(insp.inspectionDate)) {
                  if (insp.sessionTrayId) reportedSessionTrays.add(Number(insp.sessionTrayId));
                  if (insp.trayId) reportedTrays.add(Number(insp.trayId));
                }
              });
            }
          });

          setCultivatingSessionsMap(cMap);
          setInspectedSessionTrayIdsToday(reportedSessionTrays);
          setInspectedTrayIdsToday(reportedTrays);
        } catch (iotErr) {
          console.warn('Could not load cultivating sessions / inspections:', iotErr);
        }
      }

      setLoadState('ready');
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error));
      setLoadState('error');
    }
  }, [canControlIot]);
  const handleCompleteSanitation = (tray: CustomerTrayCard) => {
    if (!canControlIot || cleaningInFlight.current) return;
    Alert.alert('Xác nhận đã vệ sinh xong', `Khay ${tray.code} đã được vệ sinh và sẵn sàng sử dụng cho phiên trồng mới?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đã vệ sinh xong', onPress: () => {
        if (cleaningInFlight.current) return;
        cleaningInFlight.current = true;
        setCleaningTrayId(tray.id);
        void (async () => {
          try {
            await cultivationRepository.completeTraySanitation(tray.id);
            await loadRacks();
            Alert.alert('Đã hoàn tất', `Khay ${tray.code} đã được trả về trạng thái sẵn sàng.`);
          } catch (error) {
            Alert.alert('Chưa thể xác nhận', error instanceof Error ? error.message : 'Vui lòng thử lại.');
          } finally {
            cleaningInFlight.current = false;
            setCleaningTrayId(null);
          }
        })();
      } },
    ]);
  };

  useFocusEffect(
    useCallback(() => {
      void loadRacks();
    }, [loadRacks])
  );

  // Activate Assign Session from navigation query param (e.g. from AdminOrdersScreen)
  useEffect(() => {
    if (!canControlIot || !params.sessionId) return;
    const sId = Number(params.sessionId);
    if (!sId) return;

    let isMounted = true;
    async function activateAssignSessionFromParams() {
      try {
        const readySessions = await iotRepository.getReadyCultivationSessions();
        let target = readySessions.find((s) => s.session_id === sId);
        if (!target) {
          const allSessions = await iotRepository.getAdminCultivationSessions();
          target = allSessions.find((s) => s.session_id === sId);
        }
        if (!isMounted) return;
        if (target) {
          setAssigningSession(target);
          setSelectedTrayIdsForAssign([]);
          if (params.floorId) {
            setSelectedFloorIdForAssign(Number(params.floorId));
          } else {
            setSelectedFloorIdForAssign(null);
          }
        }
      } catch (err) {
        console.warn('Error loading session from params:', err);
      }
    }

    void activateAssignSessionFromParams();
    return () => {
      isMounted = false;
    };
  }, [canControlIot, params.sessionId, params.floorId]);

  // Requirement 3: Fetch available trays for floors from GET /api/cultivation-sessions/admin/available-trays?floorId=...
  useEffect(() => {
    if (!assigningSession) return;

    let isMounted = true;
    async function fetchAvailableTrays() {
      try {
        const floorIds = selectedFloorIdForAssign != null
          ? [selectedFloorIdForAssign]
          : racks.map((r) => r.id);

        const results = await Promise.all(
          floorIds.map(async (fId) => {
            const list = await iotRepository.getAvailableTraysForFloor(fId).catch(() => []);
            return [fId, new Set(list.map((t) => Number(t.tray_id)))] as const;
          })
        );

        if (!isMounted) return;
        setAvailableTrayIdsByFloor((prev) => {
          const next = new Map(prev);
          results.forEach(([fId, set]) => {
            next.set(fId, set);
          });
          return next;
        });
      } catch {
        // Fall back gracefully
      }
    }

    void fetchAvailableTrays();

    return () => {
      isMounted = false;
    };
  }, [assigningSession, selectedFloorIdForAssign, racks]);

  const handleRetry = () => {
    setLoadState('loading');
    void loadRacks();
  };

  const handleViewCamera = (cameraId: string) => {
    router.push({
      pathname: '/camera/[cameraId]',
      params: { cameraId },
    });
  };

  const handleViewDetails = (tray: CustomerTrayCard) => setSelectedTray(tray);

  // Assign mode actions
  const handleStartAssignWorkflow = (floorId?: number) => {
    if (floorId != null) {
      setSelectedFloorIdForAssign(floorId);
    }
    setAssignModalVisible(true);
  };

  const handleToggleSelectTrayForAssign = (tray: CustomerTrayCard, floorId: number) => {
    if (!assigningSession) return;
    const requiredTrays = assigningSession.required_trays || assigningSession.tray_quantity || 1;

    if (selectedFloorIdForAssign !== null && selectedFloorIdForAssign !== floorId) {
      Alert.alert(
        'Khác tầng nuôi trồng',
        'Tất cả các khay của một phiên nuôi trồng phải thuộc cùng một tầng. Bạn có muốn đổi sang chọn tầng này không?',
        [
          { text: 'Hủy', style: 'cancel' },
          {
            text: 'Đổi tầng',
            onPress: () => {
              setSelectedFloorIdForAssign(floorId);
              setSelectedTrayIdsForAssign([tray.id]);
            },
          },
        ]
      );
      return;
    }

    if (selectedTrayIdsForAssign.includes(tray.id)) {
      const next = selectedTrayIdsForAssign.filter((id) => id !== tray.id);
      setSelectedTrayIdsForAssign(next);
      if (next.length === 0) {
        setSelectedFloorIdForAssign(null);
      }
    } else {
      if (selectedTrayIdsForAssign.length >= requiredTrays) {
        Alert.alert(
          'Đã chọn đủ số lượng',
          `Phiên nuôi trồng này yêu cầu ${requiredTrays} khay. Vui lòng bỏ chọn một khay nếu muốn đổi vị trí.`
        );
        return;
      }
      setSelectedFloorIdForAssign(floorId);
      setSelectedTrayIdsForAssign([...selectedTrayIdsForAssign, tray.id]);
    }
  };

  const handleConfirmAssign = async () => {
    if (!assigningSession || selectedFloorIdForAssign === null) return;
    const requiredTrays = assigningSession.required_trays || assigningSession.tray_quantity || 1;
    if (selectedTrayIdsForAssign.length !== requiredTrays) {
      Alert.alert(
        'Chưa đủ số khay',
        `Phiên nuôi trồng này yêu cầu chọn đủ ${requiredTrays} khay (hiện đã chọn ${selectedTrayIdsForAssign.length} khay).`
      );
      return;
    }

    const targetFloor = racks.find((r) => r.id === selectedFloorIdForAssign);
    const floorLabel = targetFloor ? `Tầng ${targetFloor.floorNumber}` : `Tầng #${selectedFloorIdForAssign}`;

    Alert.alert(
      'Xác nhận xếp khay',
      `Bạn có chắc chắn muốn xếp ${selectedTrayIdsForAssign.length} khay đã chọn vào ${floorLabel} cho Phiên #${assigningSession.session_id}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận',
          onPress: async () => {
            setAssignSubmitting(true);
            try {
              await iotRepository.assignTraysToSession(
                assigningSession.session_id,
                selectedFloorIdForAssign,
                selectedTrayIdsForAssign
              );
              Alert.alert(
                'Xếp khay thành công',
                `Đã phân bổ thành công ${selectedTrayIdsForAssign.length} khay cho Phiên #${assigningSession.session_id}.`
              );
              setAssigningSession(null);
              setSelectedTrayIdsForAssign([]);
              setSelectedFloorIdForAssign(null);
              router.setParams({ sessionId: undefined, floorId: undefined });
              await loadRacks();
            } catch (err: unknown) {
              Alert.alert('Không thể xếp khay', getErrorMessage(err, 'Lỗi kết nối máy chủ khi xếp khay.'));
              void loadRacks();
            } finally {
              setAssignSubmitting(false);
            }
          },
        },
      ]
    );
  };

  // Daily Report actions
  const handleOpenDailyReport = (tray: CustomerTrayCard) => {
    if (!tray.sessionId) return;
    let sess = cultivatingSessionsMap.get(tray.sessionId);
    if (!sess) {
      sess = {
        session_id: tray.sessionId,
        mushroom_name: tray.mushroomName || 'Nấm giống',
        mushroom_type_id: 1,
        status: 'CULTIVATING',
        customer_name: 'Khách hàng',
        trays: [
          {
            session_tray_id: tray.sessionTrayId || tray.id,
            tray_id: tray.id,
            tray_code: tray.code,
            floor_id: tray.floorId ?? null,
            floor_number: tray.floorNumber ?? null,
            status: 'ACTIVE',
          },
        ],
      };
    } else {
      const existingTrays = sess.trays || [];
      const hasTray = existingTrays.some(
        (t) => t.session_tray_id === tray.sessionTrayId || t.tray_id === tray.id
      );
      if (!hasTray) {
        sess = {
          ...sess,
          trays: [
            ...existingTrays,
            {
              session_tray_id: tray.sessionTrayId || tray.id,
              tray_id: tray.id,
              tray_code: tray.code,
              floor_id: tray.floorId ?? null,
              floor_number: tray.floorNumber ?? null,
              status: 'ACTIVE',
            },
          ],
        };
      }
    }

    setDailyReportSession(sess);
    setDailyReportSessionTrayId(tray.sessionTrayId || tray.id);
    setDailyModalVisible(true);
  };

  const handleOpenDailyHistory = (tray: CustomerTrayCard) => {
    if (!tray.sessionId) return;
    let sess = cultivatingSessionsMap.get(tray.sessionId);
    if (!sess) {
      sess = {
        session_id: tray.sessionId,
        mushroom_name: tray.mushroomName || 'Nấm giống',
        mushroom_type_id: 1,
        status: 'CULTIVATING',
        customer_name: 'Khách hàng',
        trays: [
          {
            session_tray_id: tray.sessionTrayId || tray.id,
            tray_id: tray.id,
            tray_code: tray.code,
            floor_id: tray.floorId ?? null,
            floor_number: tray.floorNumber ?? null,
            status: 'ACTIVE',
          },
        ],
      };
    }
    setDailyReportSession(sess);
    setDailyReportSessionTrayId(tray.sessionTrayId || tray.id);
    setHistoryModalVisible(true);
  };

  // Count uninspected trays
  const uninspectedTraysCount = useMemo(() => {
    if (!canControlIot) return 0;
    let count = 0;
    for (const rack of racks) {
      for (const tray of rack.trays) {
        const isCultivating = tray.usage !== 'AVAILABLE' && Boolean(tray.sessionId);
        if (isCultivating) {
          const isInspected =
            (tray.sessionTrayId != null && inspectedSessionTrayIdsToday.has(tray.sessionTrayId)) ||
            inspectedTrayIdsToday.has(tray.id);
          if (!isInspected) {
            count += 1;
          }
        }
      }
    }
    return count;
  }, [canControlIot, racks, inspectedSessionTrayIdsToday, inspectedTrayIdsToday]);

  const requiredTraysForAssign = assigningSession
    ? assigningSession.required_trays || assigningSession.tray_quantity || 1
    : 0;

  return (
    <ScreenContainer scrollable={false} edges={['left', 'right']}>
      <AppHeader
        title={canControlIot ? 'Phòng tầng khay' : 'Khay của tôi'}
        subtitle={
          canControlIot
            ? 'Sơ đồ phòng, tầng và khay tại SmartMush Farm'
            : 'Sơ đồ khay tại SmartMush Farm'
        }
        rightAction={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {canControlIot && !assigningSession && (
              <AppButton
                title="Xếp khay"
                size="sm"
                variant="primary"
                leftIcon={<Ionicons name="grid-outline" size={14} color="#FFFFFF" />}
                onPress={() => handleStartAssignWorkflow()}
              />
            )}
            <AppIconButton
              icon={<Ionicons name="refresh-outline" size={20} color={theme.colors.text.primary} />}
              onPress={handleRetry}
              accessibilityLabel="Tải lại sơ đồ khay"
              disabled={loadState === 'loading'}
            />
          </View>
        }
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          assigningSession && { paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Assign Mode Sticky Banner */}
        {assigningSession && (
          <AppCard elevation="sm" style={styles.assignBanner}>
            <View style={styles.assignBannerHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                <View style={styles.assignIconBadge}>
                  <Ionicons name="grid" size={20} color={theme.colors.primary[700]} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodySmall" weight="bold" color={theme.colors.primary[900]}>
                    Đang xếp khay cho Phiên #{assigningSession.session_id}
                  </AppText>
                  <AppText variant="caption" color={theme.colors.primary[800]}>
                    {assigningSession.mushroom_name || 'Nấm giống'} • {assigningSession.customer_name || 'Khách hàng'}
                  </AppText>
                </View>
              </View>
              <AppButton
                title="Hủy"
                variant="outline"
                size="sm"
                onPress={() => {
                  setAssigningSession(null);
                  setSelectedTrayIdsForAssign([]);
                  setSelectedFloorIdForAssign(null);
                  router.setParams({ sessionId: undefined, floorId: undefined });
                }}
              />
            </View>
            <View style={styles.assignBannerStats}>
              <AppText variant="caption" weight="medium" color={theme.colors.text.secondary}>
                Yêu cầu: <AppText weight="bold">{requiredTraysForAssign} khay</AppText>
                {'  |  '}
                Đã chọn:{' '}
                <AppText
                  weight="bold"
                  color={
                    selectedTrayIdsForAssign.length === requiredTraysForAssign
                      ? theme.colors.success.main
                      : theme.colors.warning.main
                  }
                >
                  {selectedTrayIdsForAssign.length}/{requiredTraysForAssign} khay
                </AppText>
                {selectedFloorIdForAssign !== null &&
                  `  |  Tầng: ${racks.find((r) => r.id === selectedFloorIdForAssign)?.floorNumber ||
                  selectedFloorIdForAssign
                  }`}
              </AppText>
              <AppText variant="caption" color={theme.colors.text.muted} style={{ marginTop: 2 }}>
                💡 Nhấn vào các ô khay trống trên cùng một tầng để chọn vị trí.
              </AppText>
            </View>
          </AppCard>
        )}

        {/* Uninspected Today Warning Banner */}
        {!assigningSession && canControlIot && uninspectedTraysCount > 0 && (
          <AppCard elevation="xs" style={styles.uninspectedWarningCard}>
            <View style={styles.uninspectedRow}>
              <Ionicons name="alert-circle" size={24} color="#D97706" />
              <View style={{ flex: 1 }}>
                <AppText variant="bodySmall" weight="bold" color="#92400E">
                  Có {uninspectedTraysCount} khay chưa báo cáo hôm nay
                </AppText>
                <AppText variant="caption" color="#B45309" style={{ marginTop: 1 }}>
                  Nhấn nút &quot;Báo cáo ngay&quot; trên từng khay để cập nhật giai đoạn nấm và tình trạng quả thể.
                </AppText>
              </View>
            </View>
          </AppCard>
        )}

        <TrayLegend isStaff={canControlIot} />

        {loadState === 'loading' ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color={theme.colors.primary[600]} />
            <AppText variant="bodySmall" color={theme.colors.text.secondary}>
              Đang tải sơ đồ các tầng...
            </AppText>
          </View>
        ) : null}

        {loadState === 'error' ? (
          <AppCard elevation="sm" style={styles.messageCard}>
            <Ionicons name="cloud-offline-outline" size={34} color={theme.colors.error.main} />
            <AppText variant="title" weight="bold" align="center">
              Không thể tải sơ đồ khay
            </AppText>
            <AppText variant="bodySmall" color={theme.colors.text.secondary} align="center">
              {errorMessage}
            </AppText>
            <AppButton title="Thử lại" onPress={handleRetry} />
          </AppCard>
        ) : null}

        {loadState === 'ready' && racks.length === 0 ? (
          <AppCard elevation="xs" style={styles.emptyCard}>
            <Ionicons name="layers-outline" size={30} color={theme.colors.text.muted} />
            <AppText variant="bodySmall" color={theme.colors.text.secondary} align="center">
              Hiện chưa có tầng khay đang hoạt động.
            </AppText>
          </AppCard>
        ) : null}

        {loadState === 'ready'
          ? racks.map((rack) => (
            <View key={rack.id} style={styles.floorSection}>
              <View style={styles.floorHeading}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AppText variant="title" weight="bold" style={styles.floorTitle}>
                    Tầng {rack.floorNumber}
                  </AppText>
                  <AppText variant="caption" color={theme.colors.text.secondary}>
                    ({rack.trays.length} khay)
                  </AppText>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  {getCameraIdForFloor(rack.floorNumber) ? (
                    <AppButton
                      title="Camera"
                      variant="outline"
                      size="sm"
                      leftIcon={
                        <Ionicons
                          name="videocam-outline"
                          size={16}
                          color={theme.colors.primary[500]}
                        />
                      }
                      accessibilityLabel={`Xem camera tầng ${rack.floorNumber}`}
                      onPress={() => {
                        const cameraId = getCameraIdForFloor(rack.floorNumber);
                        if (cameraId) handleViewCamera(cameraId);
                      }}
                    />
                  ) : null}
                </View>
              </View>

              {rack.trays.length > 0 ? (
                <View style={styles.trayGrid}>
                  {rack.trays.map((tray) => {
                    const isCultivating = tray.usage !== 'AVAILABLE' && Boolean(tray.sessionId);
                    const isReportedToday = isCultivating
                      ? Boolean(
                        (tray.sessionTrayId != null &&
                          inspectedSessionTrayIdsToday.has(tray.sessionTrayId)) ||
                        inspectedTrayIdsToday.has(tray.id)
                      )
                      : false;

                    const isAssignMode = Boolean(assigningSession);
                    const isSelectedForAssign = selectedTrayIdsForAssign.includes(tray.id);

                    // Requirement 3: Use GET /api/cultivation-sessions/admin/available-trays?floorId=...
                    // as source of truth for selectable trays. Trays in available list MUST NOT be blocked.
                    const floorAvailableSet = availableTrayIdsByFloor.get(rack.id);
                    const isTrayAvailableForAssign = tray.usage === 'AVAILABLE' &&
                      (!floorAvailableSet || floorAvailableSet.has(tray.id));

                    const isDisabledForAssign =
                      isAssignMode &&
                      (!isTrayAvailableForAssign ||
                        (selectedFloorIdForAssign !== null &&
                          selectedFloorIdForAssign !== rack.id));

                    return (
                      <TrayTile
                        key={tray.id}
                        tray={tray}
                        isStaff={canControlIot}
                        isAssignMode={Boolean(assigningSession)}
                        isSelectedForAssign={isSelectedForAssign}
                        isDisabledForAssign={isDisabledForAssign}
                        isReportedToday={isReportedToday}
                        onSelectForAssign={() => handleToggleSelectTrayForAssign(tray, rack.id)}
                        onViewDetails={handleViewDetails}
                        onOpenReport={handleOpenDailyReport}
                        onOpenHistory={handleOpenDailyHistory}
                        onCompleteSanitation={handleCompleteSanitation}
                        isCleaning={cleaningTrayId === tray.id}
                        sanitationDisabled={cleaningTrayId !== null}
                        onStartAssignOnFloor={() => handleStartAssignWorkflow(rack.id)}
                      />
                    );
                  })}
                </View>
              ) : (
                <AppText variant="caption" color={theme.colors.text.secondary}>
                  Tầng này chưa có khay.
                </AppText>
              )}
            </View>
          ))
          : null}
      </ScrollView>

      {/* Floating Bottom Bar for Assign Mode */}
      {assigningSession && (
        <View style={styles.floatingBottomBar}>
          <View style={styles.bottomBarInfo}>
            <AppText variant="bodySmall" weight="bold" color="#18243B">
              Đã chọn {selectedTrayIdsForAssign.length}/{requiredTraysForAssign} khay
            </AppText>
            <AppText variant="caption" color={theme.colors.text.secondary}>
              {selectedFloorIdForAssign !== null
                ? `Tầng ${racks.find((r) => r.id === selectedFloorIdForAssign)?.floorNumber ??
                selectedFloorIdForAssign
                }`
                : 'Chưa chọn tầng'}
            </AppText>
          </View>
          <View style={styles.bottomBarActions}>
            <AppButton
              title="Hủy"
              variant="outline"
              size="sm"
              onPress={() => {
                setAssigningSession(null);
                setSelectedTrayIdsForAssign([]);
                setSelectedFloorIdForAssign(null);
                router.setParams({ sessionId: undefined, floorId: undefined });
              }}
            />
            <AppButton
              title="Xác nhận xếp"
              variant="primary"
              size="sm"
              disabled={
                selectedTrayIdsForAssign.length !== requiredTraysForAssign || assignSubmitting
              }
              loading={assignSubmitting}
              leftIcon={<Ionicons name="checkmark-done" size={16} color="#FFFFFF" />}
              onPress={handleConfirmAssign}
            />
          </View>
        </View>
      )}

      {/* Assign Session Modal */}
      <AssignSessionModal
        visible={assignModalVisible}
        onClose={() => setAssignModalVisible(false)}
        onSelectSession={(session) => {
          setAssignModalVisible(false);
          setAssigningSession(session);
          setSelectedTrayIdsForAssign([]);
        }}
      />

      {/* Daily Inspection Modal */}
      {dailyReportSession && (
        <DailyTrayInspectionModal
          visible={dailyModalVisible}
          session={dailyReportSession}
          initialSessionTrayId={dailyReportSessionTrayId}
          onClose={() => {
            setDailyModalVisible(false);
          }}
          onSuccess={() => {
            setDailyModalVisible(false);
            if (dailyReportSessionTrayId) {
              setInspectedSessionTrayIdsToday((prev) =>
                new Set(prev).add(dailyReportSessionTrayId)
              );
            }
            void loadRacks();
          }}
        />
      )}

      {/* Daily Inspection History Modal */}
      {dailyReportSession && (
        <DailyTrayInspectionHistoryModal
          visible={historyModalVisible}
          session={dailyReportSession}
          initialSessionTrayId={dailyReportSessionTrayId}
          onClose={() => setHistoryModalVisible(false)}
          onOpenCreateReport={(sessionTrayId) => {
            setHistoryModalVisible(false);
            if (sessionTrayId) {
              setDailyReportSessionTrayId(sessionTrayId);
            }
            setDailyModalVisible(true);
          }}
        />
      )}

      {selectedTray ? (
        <Modal visible transparent animationType="slide" onRequestClose={() => setSelectedTray(null)}>
          <CustomerTrayDetail
            selectedTray={selectedTray}
            onClose={() => setSelectedTray(null)}
            onAssign={canControlIot ? handleStartAssignWorkflow : undefined}
          />
        </Modal>
      ) : null}
    </ScreenContainer>
  );
}

function getCameraIdForFloor(floorNumber: number): string | null {
  switch (floorNumber) {
    case 1:
      return '3';
    case 2:
      return '2';
    default:
      return null;
  }
}

interface TrayTileProps {
  onCompleteSanitation: (tray: CustomerTrayCard) => void;
  isCleaning: boolean;
  sanitationDisabled: boolean;
  tray: CustomerTrayCard;
  isStaff: boolean;
  isAssignMode: boolean;
  isSelectedForAssign: boolean;
  isDisabledForAssign: boolean;
  isReportedToday: boolean;
  onSelectForAssign: () => void;
  onViewDetails: (tray: CustomerTrayCard) => void;
  onOpenReport: (tray: CustomerTrayCard) => void;
  onOpenHistory: (tray: CustomerTrayCard) => void;
  onStartAssignOnFloor: () => void;
}

const TrayTile: React.FC<TrayTileProps> = ({
  onCompleteSanitation,
  isCleaning,
  sanitationDisabled,
  tray,
  isStaff,
  isAssignMode,
  isSelectedForAssign,
  isDisabledForAssign,
  isReportedToday,
  onSelectForAssign,
  onViewDetails,
  onOpenReport,
  onOpenHistory,
  onStartAssignOnFloor,
}) => {
  const { fontScale } = useWindowDimensions();
  const isMine = tray.usage === 'MY_CULTIVATION';
  const isInUse = isMine || tray.usage === 'OTHER_CULTIVATION';
  const isBlocked = tray.usage === 'MAINTENANCE' || tray.usage === 'INACTIVE';

  // Palette based on mode and status
  let palette = {
    background: '#F8FAFC',
    border: '#CBD5E1',
    text: '#64748B',
    accent: '#94A3B8',
  };

  if (isAssignMode) {
    if (isSelectedForAssign) {
      palette = {
        background: '#ECFDF5',
        border: '#059669',
        text: '#047857',
        accent: '#10B981',
      };
    } else if (isInUse) {
      palette = {
        background: '#F1F5F9',
        border: '#E2E8F0',
        text: '#94A3B8',
        accent: '#CBD5E1',
      };
    } else {
      palette = {
        background: '#FFFFFF',
        border: '#0284C7',
        text: '#0369A1',
        accent: '#38BDF8',
      };
    }
  } else if (isMine) {
    palette = {
      background: '#E8F5EC',
      border: '#168A4A',
      text: '#08743A',
      accent: '#16A34A',
    };
  } else if (tray.usage === 'OTHER_CULTIVATION') {
    palette = {
      background: '#EAF2FB',
      border: '#2F70B7',
      text: '#275E99',
      accent: '#3478C5',
    };
  }

  if (isBlocked) palette = { background: '#FFF7ED', border: '#FDBA74', text: '#9A3412', accent: '#EA580C' };

  // Handle tile click
  const handleTilePress = () => {
    if (isAssignMode) {
      if (!isDisabledForAssign) {
        onSelectForAssign();
      }
    } else if (isInUse || isBlocked) {
      onViewDetails(tray);
    } else if (isStaff) {
      onStartAssignOnFloor();
    } else {
      onViewDetails(tray);
    }
  };

  return (
    <Pressable
      onPress={handleTilePress}
      disabled={isAssignMode && isDisabledForAssign}
      style={({ pressed }) => [
        styles.trayTile,
        {
          height: 220 * Math.max(1, fontScale),
          backgroundColor: palette.background,
          borderColor: palette.border,
          borderWidth: isSelectedForAssign ? 2 : 1,
        },
        !isInUse && !isBlocked && !isAssignMode && styles.unusedTile,
        isDisabledForAssign && { opacity: 0.4 },
        pressed && !isDisabledForAssign && { opacity: 0.8 },
      ]}
      accessibilityLabel={`${tray.code}, ${isMine
          ? `khay của tôi, đang trồng ${tray.mushroomName ?? 'nấm'}`
          : isInUse
            ? `đang trồng ${tray.mushroomName ?? 'nấm'}`
            : isBlocked ? 'bảo trì hoặc ngừng sử dụng' : 'chưa sử dụng'
        }`}
    >
      {/* Top Header Row */}
      <View style={styles.tileHeading}>
        <AppText
          variant="captionMedium"
          weight="bold"
          color={palette.text}
          numberOfLines={1}
          style={styles.tileCode}
        >
          {tray.code}
        </AppText>
        {isAssignMode ? (
          isSelectedForAssign ? (
            <Ionicons name="checkmark-circle" size={18} color="#059669" />
          ) : !isDisabledForAssign ? (
            <Ionicons name="add-circle-outline" size={17} color="#0284C7" />
          ) : null
        ) : isInUse ? (
          <Ionicons name="leaf-outline" size={16} color={palette.text} />
        ) : null}
      </View>

      {isInUse && <View style={{ alignItems: 'center', paddingVertical: 4 }}>
        <TrayMushroomImage uri={tray.mushroomImageUrl} name={tray.mushroomName} />
      </View>}
      {/* Middle Body */}
      {isAssignMode ? (
        <View style={styles.tileCenterContent}>
          {isSelectedForAssign ? (
            <View style={styles.selectedAssignBadge}>
              <AppText variant="caption" weight="bold" color="#047857" style={{ fontSize: 11 }}>
                ĐÃ CHỌN
              </AppText>
            </View>
          ) : !isDisabledForAssign ? (
            <AppText variant="caption" color="#0369A1" align="center" style={{ fontSize: 11 }}>
              Chạm để chọn
            </AppText>
          ) : (
            <AppText variant="caption" color="#94A3B8" align="center" style={{ fontSize: 11 }}>
              {isInUse ? (tray.mushroomName ?? 'Đang trồng') : 'Không khả dụng'}
            </AppText>
          )}
        </View>
      ) : isInUse ? (
        <View style={styles.tileCenterContent}>
          <AppText variant="caption" weight="medium" color={palette.text} numberOfLines={2}>
            {tray.mushroomName ?? 'Đang trồng nấm'}
          </AppText>

          {/* Staff Daily Inspection Status Badge */}
          {isStaff && (
            <View
              style={[
                styles.inspectionBadge,
                isReportedToday ? styles.inspectionBadgeSuccess : styles.inspectionBadgeWarning,
              ]}
            >
              <Ionicons
                name={isReportedToday ? 'checkmark-circle' : 'alert-circle'}
                size={11}
                color={isReportedToday ? '#047857' : '#B45309'}
              />
              <AppText
                variant="caption"
                weight="bold"
                color={isReportedToday ? '#047857' : '#B45309'}
                style={styles.inspectionBadgeText}
                numberOfLines={1}
              >
                {isReportedToday ? 'Đã báo cáo' : 'Chưa báo cáo'}
              </AppText>
            </View>
          )}
        </View>
      ) : (
        <View style={styles.tileCenterContent}>
          {isBlocked && <Ionicons name="construct-outline" size={22} color={palette.accent} />}
          <AppText variant="caption" color={palette.text} align="center" style={{ fontSize: 11 }}>
            {tray.usage === 'MAINTENANCE' ? 'Bảo trì / vệ sinh' : tray.usage === 'INACTIVE' ? 'Ngừng sử dụng' : 'Chưa sử dụng'}
          </AppText>

        </View>
      )}

      {/* Bottom Action Area */}
      {!isAssignMode && isStaff && tray.usage === 'MAINTENANCE' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Xác nhận đã vệ sinh xong khay ${tray.code}`}
          disabled={sanitationDisabled}
          onPress={e => { e.stopPropagation(); onCompleteSanitation(tray); }}
          style={[styles.reportNowButton, { minHeight: 40, opacity: sanitationDisabled ? 0.5 : 1 }]}
        >
          {isCleaning ? <ActivityIndicator color="#FFFFFF" size="small" /> :
            <AppText variant="caption" color="#FFFFFF" weight="bold" align="center">Đã vệ sinh xong</AppText>}
        </Pressable>
      )}
      {!isAssignMode && isInUse ? (
        isStaff ? (
          <View style={styles.tileActionCol}>
            {!isReportedToday ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Báo cáo ngay cho khay ${tray.code}`}
                onPress={(e) => {
                  e.stopPropagation?.();
                  onOpenReport(tray);
                }}
                style={({ pressed }) => [
                  styles.reportNowButton,
                  pressed && { opacity: 0.8 },
                ]}
              >
                <Ionicons name="create-outline" size={13} color="#FFFFFF" />
                <AppText variant="caption" weight="bold" color="#FFFFFF" style={{ fontSize: 11 }}>
                  Báo cáo ngay
                </AppText>
              </Pressable>
            ) : (
              <View style={styles.reportedActionRow}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Lịch sử báo cáo khay ${tray.code}`}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    onOpenHistory(tray);
                  }}
                  style={({ pressed }) => [
                    styles.historyMiniButton,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Ionicons name="time-outline" size={11} color="#047857" />
                  <AppText variant="caption" weight="medium" color="#047857" style={{ fontSize: 10 }}>
                    Lịch sử
                  </AppText>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Xem chi tiết khay ${tray.code}`}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    onViewDetails(tray);
                  }}
                  style={({ pressed }) => [
                    styles.detailsMiniButton,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Ionicons name="document-text-outline" size={11} color="#475569" />
                  <AppText variant="caption" weight="medium" color="#475569" style={{ fontSize: 10 }}>
                    Chi tiết
                  </AppText>
                </Pressable>
              </View>
            )}
            {!isReportedToday && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation?.();
                  onViewDetails(tray);
                }}
                style={({ pressed }) => [
                  styles.viewDetailsTextLink,
                  pressed && { opacity: 0.7 },
                ]}
              >
                <AppText variant="caption" color="#475569" style={{ fontSize: 10 }}>
                  Xem chi tiết
                </AppText>
              </Pressable>
            )}
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Xem chi tiết khay ${tray.code}`}
            onPress={(e) => {
              e.stopPropagation?.();
              onViewDetails(tray);
            }}
            style={({ pressed }) => [
              styles.detailsButton,
              pressed && { opacity: 0.75 },
            ]}
          >
            <Ionicons name="document-text-outline" size={13} color="#08743A" />
            <AppText variant="caption" weight="bold" color="#08743A" numberOfLines={1}>
              Chi tiết
            </AppText>
          </Pressable>
        )
      ) : null}

      <View style={[styles.tileStatusLine, { backgroundColor: palette.accent }]} />
    </Pressable>
  );
};

const TrayLegend: React.FC<{ isStaff?: boolean }> = ({ isStaff }) => (
  <View style={styles.legend}>
    {!isStaff && <LegendItem color="#168A4A" label="Khay của tôi" />}
    <LegendItem color={isStaff ? '#168A4A' : '#3478C5'} label="Đang trồng" />
    <LegendItem color="#94A3B8" label="Chưa sử dụng" />
    <LegendItem color="#EA580C" label="Bảo trì / vệ sinh" />
    {isStaff && <LegendItem color="#059669" label="Đang chọn xếp" />}
  </View>
);

const LegendItem: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendDot, { backgroundColor: color }]} />
    <AppText variant="caption" color={theme.colors.text.secondary}>
      {label}
    </AppText>
  </View>
);

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: theme.spacing.screenHorizontal,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing['2xl'],
    gap: theme.spacing.md,
  },
  assignBanner: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1.5,
    borderColor: '#10B981',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  assignBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  assignIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  assignBannerStats: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(16, 185, 129, 0.2)',
    paddingTop: theme.spacing.xs,
  },
  uninspectedWarningCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#F59E0B',
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.sm,
  },
  uninspectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing['2xl'],
    gap: theme.spacing.sm,
  },
  messageCard: {
    alignItems: 'center',
    gap: theme.spacing.md,
    padding: theme.spacing.lg,
  },
  emptyCard: {
    alignItems: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: theme.borderRadius.full,
  },
  floorSection: {
    gap: theme.spacing.sm,
    marginTop: theme.spacing.xs,
  },
  floorTitle: {
    color: '#18243B',
  },
  floorHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  trayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: theme.spacing.sm,
  },
  trayTile: {
    width: '31.5%',
    minHeight: 220,
    borderRadius: 12,
    padding: theme.spacing.xs,
    justifyContent: 'space-between',
    gap: 4,
  },
  unusedTile: {
    borderStyle: 'dashed',
  },
  tileHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 2,
  },
  tileCode: {
    flexShrink: 1,
  },
  tileCenterContent: {
    gap: 3,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  selectedAssignBadge: {
    backgroundColor: 'rgba(5, 150, 105, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inspectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  inspectionBadgeSuccess: {
    backgroundColor: '#DCFCE7',
    borderWidth: 0.5,
    borderColor: '#10B981',
  },
  inspectionBadgeWarning: {
    backgroundColor: '#FEF3C7',
    borderWidth: 0.5,
    borderColor: '#F59E0B',
  },
  inspectionBadgeText: {
    fontSize: 9.5,
  },
  tileActionCol: {
    gap: 3,
  },
  reportNowButton: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingHorizontal: 4,
    borderRadius: 6,
    backgroundColor: '#059669',
  },
  reportedActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  historyMiniButton: {
    flex: 1,
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    backgroundColor: '#ECFDF5',
  },
  detailsMiniButton: {
    flex: 1,
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  viewDetailsTextLink: {
    alignItems: 'center',
    paddingVertical: 1,
  },
  detailsButton: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A8D4B5',
    backgroundColor: '#FFFFFF',
  },
  tileStatusLine: {
    height: 3,
    width: '100%',
    borderRadius: 3,
  },
  floatingBottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.light,
    paddingHorizontal: theme.spacing.screenHorizontal,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  bottomBarInfo: {
    flex: 1,
    gap: 2,
  },
  bottomBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },

});
