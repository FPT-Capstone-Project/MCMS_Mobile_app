import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppAlert, AppModal } from '../../../../shared/components/feedback/AppDialog';
import { AppButton, AppCard, AppHeader, AppInput, AppText } from '../../../../shared/components';
import { theme } from '../../../../core/theme';
import { GROWTH_STAGE_LABELS } from '../../../../core/constants/growthStages';
import type { CultivationSessionAdmin } from '../../../iot/domain/entities/Iot';
import { operatorConsultationRepository } from '../../../expert/data/repositories/operator-consultation-repository';
import { trayQr, type GrowthStage, type TrayScan, type GrowthOverview } from '../../data/trayQr';
import { cultivationRepository } from '../../data/repositories/CultivationRepository';
import { AppError } from '../../../../core/errors/appError';

interface Props {
  visible: boolean;
  session: CultivationSessionAdmin | null;
  initialSessionTrayId?: number | null;
  initialAction?: 'issue' | 'growth';
  expectedTrayId?: number | null;
  onClose: () => void;
  onSuccess: () => void;
}
export function DailyTrayInspectionModal(props: Props) {
  return props.visible ? <TrayWorkflow {...props} /> : null;
}
function TrayWorkflow({
  initialAction,
  session,
  expectedTrayId,
  initialSessionTrayId,
  onClose,
  onSuccess,
}: Props) {
  const [permission, ask, checkPermission] = useCameraPermissions({
    request: initialAction !== 'growth',
  });
  const [scan, setScan] = useState<TrayScan | null>(null);
  const [token, setToken] = useState('');
  const [overview, setOverview] = useState<GrowthOverview | null>(null);
  const [action, setAction] = useState<'growth' | 'issue' | null>(
    initialAction === 'growth' ? 'growth' : null
  );
  const [stage, setStage] = useState<GrowthStage | null>(null);
  const [trayCondition, setTrayCondition] = useState('');
  const [mushroomCondition, setMushroomCondition] = useState('');
  const [notes, setNotes] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('DISEASE');
  const [severity, setSeverity] = useState('MEDIUM');
  const [question, setQuestion] = useState<string | null>(null);
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [issueId, setIssueId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const scanned = useRef(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [scanningGrowth, setScanningGrowth] = useState(false);
  const [paused, setPaused] = useState(false);
  const [existingReport, setExistingReport] = useState(false);
  const [attachmentId, setAttachmentId] = useState<number | null>(null);
  const active = scan?.sessions[0];
  const latest = overview?.trays.find(
    (item) => Number(item.tray_id) === Number(scan?.tray.tray_id)
  )?.growth_status;
  useEffect(() => {
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active')
        void checkPermission().catch(() => setError('Không đọc được quyền camera.'));
    });
    return () => listener.remove();
  }, [checkPermission]);

  async function work(fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa thực hiện được. Vui lòng thử lại.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function resetForm() {
    setAction(null);
    setIssueId(null);
    setPhotos([]);
    setQuestion(null);
    setTitle('');
    setType('DISEASE');
    setSeverity('MEDIUM');
    setNotes('');
    setTrayCondition('');
    setMushroomCondition('');
    setStage(null);
    setExistingReport(false);
    setAttachmentId(null);
    setError('');
  }
  function restart() {
    resetForm();
    setScan(null);
    setOverview(null);
    setNotice('');
    setPaused(false);
    scanned.current = false;
  }
  async function read(data: string) {
    if (scanned.current || lock.current) return;
    scanned.current = true;
    setPaused(true);
    await work(async () => {
      const result = await trayQr.scan(data);
      const current = result.sessions[0];
      if (
        (expectedTrayId && Number(result.tray.tray_id) !== Number(expectedTrayId)) ||
        (session && Number(current?.session_id) !== Number(session.session_id)) ||
        (initialSessionTrayId && Number(current?.session_tray_id) !== Number(initialSessionTrayId))
      ) {
        throw new Error('Mã QR không khớp với khay hoặc phiên đang mở.');
      }
      if (scanningGrowth) {
        if (!current || current.status !== 'CULTIVATING')
          throw new Error('Khay này không có phiên đang trồng. Hãy quét khay khác.');
        setToken(data);
        setScan(result);
        setScanningGrowth(false);
        await saveGrowth(result, data);
        return;
      }
      const progress = current
        ? await trayQr.overview(current.session_id).catch(() => {
            setNotice('Chưa tải được giai đoạn gần nhất.');
            return null;
          })
        : null;
      setToken(data);
      setOverview(progress);
      setScan(result);
      if (initialAction === 'issue' && current) setAction('issue');
    });
  }
  async function selectPhotos(camera: boolean) {
    await work(async () => {
      const access = camera ? await ImagePicker.requestCameraPermissionsAsync() : { granted: true };
      if (!access.granted) {
        setError('Cần quyền camera để chụp ảnh.');
        return;
      }
      const result = camera
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: 10 - photos.length,
            quality: 0.8,
          });
      if (!result.canceled) setPhotos((prev) => [...prev, ...result.assets].slice(0, 10));
    });
  }
  async function finishGrowth(result: TrayScan, qrToken: string, savedStage: GrowthStage) {
    resetForm();
    setNotice('Đã cập nhật ' + result.tray.tray_code + ' · ' + GROWTH_STAGE_LABELS[savedStage]);
    onSuccess();
    const sessionId = result.sessions[0].session_id;
    setOverview(await trayQr.overview(sessionId).catch(() => null));
    setScan(await trayQr.scan(qrToken).catch(() => result));
  }
  async function saveGrowth(scan: TrayScan, qrToken: string) {
    const active = scan.sessions[0];
    if (!stage || !active) return;
    const fields = {
      qr_token: qrToken,
      growth_status: stage,
      notes,
      trayCondition,
      mushroomCondition,
    };
    if (!existingReport) {
      try {
        await trayQr.growth(fields, photos);
        await finishGrowth(scan, qrToken, stage);
        return;
      } catch (err) {
        if (!(
          err instanceof AppError &&
          (err.code === 'DUPLICATE_DAILY_INSPECTION' || /already been recorded/.test(err.message))
        ))
          throw err;
        setExistingReport(true);
      }
    }
    let id = attachmentId;
    if (!id) {
      await trayQr.growth(fields, []);
      setNotice('Đã lưu giai đoạn. Đang bổ sung ảnh vào biên bản.');
      const progress = await trayQr.overview(active.session_id);
      const updated = progress.trays.find((t) => Number(t.tray_id) === Number(scan.tray.tray_id));
      const history = await cultivationRepository.getTrayDailyInspectionHistory(
        active.session_id,
        active.session_tray_id
      );
      const matches = history.inspections.filter(
        (i) =>
          updated?.last_inspection_at &&
          new Date(i.inspectionDate).getTime() === new Date(updated.last_inspection_at).getTime()
      );
      if (matches.length !== 1 || updated?.growth_status !== stage)
        throw new Error('Đã lưu giai đoạn. Chưa xác định được biên bản để bổ sung ảnh.');
      id = matches[0].inspectionId;
      setAttachmentId(id);
    }
    for (const image of photos) {
      await trayQr.attachPhoto(id, image);
      setPhotos((prev) => prev.slice(1));
    }
    await finishGrowth(scan, qrToken, stage);
  }
  async function submit() {
    await work(async () => {
      if (!active || !scan) return;
      if (action === 'issue') {
        let id = issueId;
        if (!id) {
          const issue = await trayQr.issue(
            { qr_token: token, issue_type: type, severity, title, description: notes },
            photos
          );
          id = issue.issue_id;
          setIssueId(id);
        }
        try {
          await operatorConsultationRepository.requestForQrIssue(id, (question ?? notes).trim());
        } catch {
          throw new Error('Đã lưu sự cố #' + id + '. Kiểm tra kết nối và gửi lại yêu cầu tư vấn.');
        }
        setNotice('Đã gửi yêu cầu tư vấn cho chuyên gia.');
      }
      resetForm();
      onSuccess();
      setOverview(await trayQr.overview(active.session_id));
      setScan(await trayQr.scan(token));
    });
  }
  const lockedForm = busy || !!issueId || !!attachmentId || (action === 'growth' && !!scan);
  function goBack() {
    if (lock.current) return;
    if (scanningGrowth) {
      setScanningGrowth(false);
      setPaused(false);
      setError('');
      scanned.current = false;
    } else if (scan && action === 'issue' && !issueId && initialAction !== 'issue') {
      resetForm();
    } else {
      onClose();
    }
  }
  const headerTitle = scanningGrowth ? 'Quét QR khay'
    : action === 'growth' ? 'Cập nhật tiến độ'
    : action === 'issue' ? 'Báo cáo sự cố'
    : scan ? 'Khay ' + scan.tray.tray_code : 'Quét QR khay';
  return (
    <AppModal visible statusBarTranslucent presentationStyle="fullScreen" animationType="slide" onRequestClose={goBack}>
      <SafeAreaView style={styles.page} edges={['left', 'right', 'bottom']}>
        <AppHeader title={headerTitle} subtitle={action && scan ? 'Khay ' + scan.tray.tray_code : undefined}
          showBack backDisabled={busy} onBack={goBack} />
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
          {!scan && (action !== 'growth' || scanningGrowth) && (
            <>
              <AppText>
                {scanningGrowth && stage
                  ? 'Quét khay để ghi nhận: ' + GROWTH_STAGE_LABELS[stage]
                  : 'Đưa tem QR trên khay vào khung camera.'}
              </AppText>
              {permission?.granted && !paused ? (
                <View style={styles.camera}>
                  <CameraView
                    style={StyleSheet.absoluteFill}
                    facing="back"
                    barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                    onBarcodeScanned={({ data }) => void read(data)}
                    onMountError={() => {
                      setPaused(true);
                      setError('Không mở được camera. Vui lòng thử lại.');
                    }}
                  />
                  <View pointerEvents="none" style={styles.frame} />
                </View>
              ) : null}
              {permission && !permission.granted && (
                <AppButton
                  title={permission.canAskAgain ? 'Cho phép dùng camera' : 'Mở cài đặt camera'}
                  onPress={() => {
                    if (permission.canAskAgain) void ask();
                    else void Linking.openSettings();
                  }}
                />
              )}
              {paused && !busy && (
                <AppButton
                  title="Quét lại"
                  onPress={() => {
                    setPaused(false);
                    setError('');
                    scanned.current = false;
                  }}
                />
              )}
            </>
          )}
          {scan && (
            <AppCard variant="outlined">
              <AppText weight="bold">
                {active
                  ? active.mushroom_name + ' · Phiên #' + active.session_id
                  : 'Khay chưa gắn phiên trồng'}
              </AppText>
              <AppText>
                {latest
                  ? GROWTH_STAGE_LABELS[latest]
                  : scan.tray.status === 'MAINTENANCE'
                    ? 'Chờ vệ sinh'
                    : active
                      ? overview
                        ? 'Chưa ghi giai đoạn'
                        : 'Đang canh tác'
                      : 'Khay trống'}
              </AppText>
              {active?.harvest_status === 'HARVEST_READY' && (
                <AppText color={theme.colors.success.dark}>Sẵn sàng thu hoạch</AppText>
              )}
            </AppCard>
          )}
          {!!notice && (
            <AppText weight="bold" color={theme.colors.success.dark}>
              {notice}
            </AppText>
          )}
          {scan && !action && (
            <>
              {active && (
                <AppButton
                  title="Báo cáo sự cố"
                  variant="outline"
                  disabled={busy}
                  onPress={() => {
                    resetForm();
                    setNotice('');
                    setAction('issue');
                  }}
                />
              )}
              {!active && scan.tray.status === 'MAINTENANCE' && (
                <AppButton
                  title="Xác nhận đã vệ sinh"
                  disabled={busy}
                  onPress={() =>
                    AppAlert.alert(
                      'Hoàn tất vệ sinh',
                      'Trả khay ' + scan.tray.tray_code + ' về trạng thái sẵn sàng?',
                      [
                        { text: 'Quay lại', style: 'cancel' },
                        {
                          text: 'Xác nhận',
                          onPress: () =>
                            void work(async () => {
                              await trayQr.sanitize(token);
                              setNotice('Đã xác nhận vệ sinh khay.');
                              onSuccess();
                              setScan(await trayQr.scan(token));
                            }),
                        },
                      ]
                    )
                  }
                />
              )}
              {!expectedTrayId && !session && (
                <AppButton
                  title="Quét khay tiếp theo"
                  disabled={busy}
                  variant="ghost"
                  onPress={() => {
                    restart();
                    if (initialAction === 'growth') setAction('growth');
                  }}
                />
              )}
            </>
          )}
          {action && !scanningGrowth && (
            <>
              {action === 'growth' ? (
                <>
                  <AppText weight="bold">Giai đoạn sinh trưởng</AppText>
                  {Object.entries(GROWTH_STAGE_LABELS).map(([key, label]) => (
                    <AppButton
                      key={key}
                      title={label}
                      disabled={lockedForm}
                      variant={stage === key ? 'primary' : 'outline'}
                      onPress={() => setStage(key as GrowthStage)}
                    />
                  ))}
                  <AppInput
                    label="Tình trạng khay"
                    editable={!lockedForm}
                    value={trayCondition}
                    onChangeText={setTrayCondition}
                    maxLength={500}
                  />
                  <AppInput
                    label="Tình trạng nấm"
                    editable={!lockedForm}
                    value={mushroomCondition}
                    onChangeText={setMushroomCondition}
                    maxLength={500}
                  />
                </>
              ) : (
                <>
                  <AppInput
                    label="Tiêu đề sự cố"
                    editable={!lockedForm}
                    value={title}
                    onChangeText={setTitle}
                    maxLength={255}
                  />
                  <AppText weight="bold">Loại sự cố</AppText>
                  <View style={styles.row}>
                    {Object.entries({
                      DISEASE: 'Bệnh nấm',
                      CONTAMINATION: 'Nhiễm tạp',
                      QUALITY_FAILURE: 'Chất lượng',
                      DAMAGE: 'Hư hại',
                      OTHER: 'Khác',
                    }).map(([key, label]) => (
                      <AppButton
                        key={key}
                        size="sm"
                        title={label}
                        variant={type === key ? 'primary' : 'outline'}
                        disabled={lockedForm}
                        onPress={() => setType(key)}
                      />
                    ))}
                  </View>
                  <AppText weight="bold">Mức độ</AppText>
                  <View style={styles.row}>
                    {Object.entries({ LOW: 'Nhẹ', MEDIUM: 'Vừa', HIGH: 'Nghiêm trọng' }).map(
                      ([key, label]) => (
                        <AppButton
                          key={key}
                          title={label}
                          disabled={lockedForm}
                          variant={severity === key ? 'primary' : 'outline'}
                          onPress={() => setSeverity(key)}
                        />
                      )
                    )}
                  </View>
                </>
              )}
              <AppInput
                multiline
                label={action === 'growth' ? 'Ghi chú' : 'Mô tả sự cố'}
                value={notes}
                editable={!lockedForm}
                onChangeText={setNotes}
                maxLength={action === 'growth' ? 1000 : 5000}
              />
              {action === 'issue' && (
                <AppInput
                  label="Câu hỏi cho chuyên gia"
                  value={question ?? notes}
                  editable={!busy}
                  onChangeText={setQuestion}
                  multiline
                />
              )}
              <View style={styles.row}>
                {photos.map((p, i) => (
                  <View key={p.uri + i}>
                    <Image source={{ uri: p.uri }} style={styles.photo} />
                    <AppButton
                      title="Bỏ ảnh"
                      size="sm"
                      variant="ghost"
                      disabled={lockedForm}
                      onPress={() => setPhotos((prev) => prev.filter((_, index) => index !== i))}
                    />
                  </View>
                ))}
              </View>
              <AppButton
                title={'Chụp ảnh (' + photos.length + '/10)'}
                variant="outline"
                disabled={lockedForm || photos.length >= 10}
                onPress={() => void selectPhotos(true)}
              />
              <AppButton
                title="Chọn ảnh từ thư viện"
                variant="ghost"
                disabled={lockedForm || photos.length >= 10}
                onPress={() => void selectPhotos(false)}
              />
              <AppButton
                title={
                  action === 'issue'
                    ? issueId
                      ? 'Gửi lại yêu cầu tư vấn'
                      : 'Gửi cho chuyên gia'
                    : scan
                      ? 'Thử lại với khay này'
                      : 'Quét QR để cập nhật'
                }
                loading={busy}
                disabled={
                  busy ||
                  (action === 'growth'
                    ? !stage
                    : !title.trim() || !type.trim() || !notes.trim() || !(question ?? notes).trim())
                }
                onPress={() => {
                  if (action === 'issue') return void submit();
                  if (scan) return void work(() => saveGrowth(scan, token));
                  setScanningGrowth(true);
                  if (permission?.canAskAgain && !permission.granted) void ask();
                }}
              />
            </>
          )}
          {busy && !action && <ActivityIndicator />}
          {!!error && <AppText color={theme.colors.error.dark}>{error}</AppText>}
        </ScrollView>
      </SafeAreaView>
    </AppModal>
  );
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: theme.colors.background.default },
  body: { padding: 20, gap: 14, paddingBottom: 40 },
  camera: {
    height: 310,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: { width: 200, height: 200, borderRadius: 16, borderWidth: 2, borderColor: 'white' },
  photo: { width: 92, height: 92, borderRadius: 10 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
