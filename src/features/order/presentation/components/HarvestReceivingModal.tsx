import { AppModal as Modal } from '../../../../shared/components/feedback/AppDialog';
import { PickupSchedulePicker } from './PickupSchedulePicker';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../../../core/theme';
import { AppButton, AppCard, AppInput, AppText } from '../../../../shared/components';
import { formatAddress, parseAddress } from '../../../../shared/utils/address';
import {
  formatVietnamDate,
  getCustomerPickupDateKeys,
  getCustomerPickupTimeOptions,
  getVietnamDateKey,
  toVietnamDateTime,
} from '../../domain/harvestSchedule';
import { CustomerCultivationStatus } from '../../domain/entities/Order';

type ReadySession = CustomerCultivationStatus['sessions'][number];
type Method = 'PICKUP' | 'DELIVERY';

export function HarvestReceivingModal({ visible, session, profileAddress, profilePhone, farmAddress, onClose, onSavePhone, onConfirm }: {
  visible: boolean;
  session: ReadySession | null;
  profileAddress: string;
  profilePhone: string;
  farmAddress: string;
  onClose: () => void;
  onSavePhone: (phone: string) => Promise<void>;
  onConfirm: (data: { method: Method; address?: string; scheduledAt?: string }) => Promise<void>;
}) {
  const [method, setMethod] = useState<Method | null>(null);
  const [step, setStep] = useState<'phone' | 'choose' | 'address' | 'schedule' | 'review'>(profilePhone.trim() ? 'choose' : 'phone');
  const [addressParts, setAddressParts] = useState(() => parseAddress(profileAddress));
  const [phone, setPhone] = useState(profilePhone);
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const close = () => {
    setMethod(null);
    setStep(profilePhone.trim() ? 'choose' : 'phone');
    setAddressParts(parseAddress(profileAddress));
    setPhone(profilePhone);
    setPickupDate('');
    setPickupTime('');
    setError(null);
    onClose();
  };

  const savePhone = async () => {
    const normalizedPhone = phone.trim();
    if (!/^(0|84)(3|5|7|8|9)[0-9]{8}$/.test(normalizedPhone)) {
      setError('Vui lòng nhập số điện thoại Việt Nam hợp lệ.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSavePhone(normalizedPhone);
      setPhone(normalizedPhone);
      setStep('choose');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Không thể lưu số điện thoại. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  const startConfirm = (next: Method) => {
    setMethod(next);
    setAddressParts(parseAddress(session?.delivery_address || profileAddress));
    setError(null);
    if (next === 'PICKUP') {
      const dateOptions = getCustomerPickupDateKeys(session?.harvest_ready_at);
      const existingDate = session?.scheduled_at ? getVietnamDateKey(session.scheduled_at) : null;
      const nextDate = existingDate && dateOptions.includes(existingDate) ? existingDate : dateOptions[0] ?? '';
      const existingTime = session?.scheduled_at
        ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(session.scheduled_at))
        : '';
      setPickupDate(nextDate);
      setPickupTime(existingDate === nextDate ? existingTime : '');
      setStep('schedule');
    } else {
      setStep('address');
    }
  };

  const submit = async () => {
    if (!method || saving) return;
    const deliveryAddress = formatAddress(addressParts);
    const scheduledAt = pickupDate && pickupTime ? toVietnamDateTime(pickupDate, pickupTime) : undefined;
    if (method === 'DELIVERY' && Object.values(addressParts).some((part) => !part.trim())) {
      setStep('address');
      setError('Vui lòng nhập đầy đủ 4 phần địa chỉ nhận hàng.');
      return;
    }
    if (method === 'PICKUP' && (!scheduledAt || !getCustomerPickupDateKeys(session?.harvest_ready_at).includes(pickupDate)
      || !getCustomerPickupTimeOptions(pickupDate).includes(pickupTime))) {
      setStep('schedule');
      setError('Vui lòng chọn ngày trong 3 ngày từ khi sẵn sàng thu hoạch và giờ từ 07:00 đến 17:00.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onConfirm(method === 'PICKUP'
        ? { method, scheduledAt }
        : { method, address: deliveryAddress });
      close();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Không thể lưu lựa chọn nhận nấm. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  if (!session) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={styles.headerIcon}><Ionicons name="basket-outline" size={20} color={theme.colors.primary[700]} /></View>
          <View style={styles.headerCopy}>
            <AppText variant="title" weight="bold">{step === 'phone' ? 'Bổ sung số điện thoại' : 'Chọn phương thức giao hàng'}</AppText>
            <AppText variant="caption" color={theme.colors.text.secondary}>{session.mushroom_name} · Phiên #{session.session_id}</AppText>
          </View>
          <AppButton title="Đóng" variant="ghost" size="sm" onPress={close} />
        </View>

        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
          {step === 'phone' ? (
            <AppCard variant="outlined" style={styles.panel}>
              <AppText variant="bodySmall" color={theme.colors.text.secondary}>
                Hồ sơ của bạn chưa có số điện thoại. Vui lòng bổ sung số điện thoại để tiếp tục chọn phương thức nhận hàng.
              </AppText>
              <AppInput
                label="Số điện thoại"
                placeholder="Ví dụ: 0912345678"
                value={phone}
                onChangeText={(value) => { setPhone(value); setError(null); }}
                keyboardType="phone-pad"
                maxLength={11}
                editable={!saving}
                error={error ?? undefined}
              />
              <AppButton title="Lưu số điện thoại và tiếp tục" variant="primary" loading={saving} onPress={() => void savePhone()} />
            </AppCard>
          ) : null}

          {step === 'choose' ? (
            <>
              <AppText variant="bodySmall" color={theme.colors.text.secondary}>Nấm đã sẵn sàng thu hoạch. Bạn muốn nhận nấm theo cách nào?</AppText>
              <Choice icon="location-outline" title="Đến trang trại hái nấm" detail="Tự đến nhận nấm tại trang trại" onPress={() => startConfirm('PICKUP')} />
              <Choice icon="car-outline" title="Giao nấm đến địa chỉ" detail="Xác nhận địa chỉ nhận hàng của bạn" onPress={() => startConfirm('DELIVERY')} />
            </>
          ) : null}

          {step === 'address' ? (
            <AppCard variant="outlined" style={styles.panel}>
              <AppText variant="bodySmall" weight="bold">Xác nhận địa chỉ nhận hàng</AppText>
              <AppText variant="caption" color={theme.colors.text.secondary}>
                {profileAddress.trim() ? 'Địa chỉ đang lưu trong hồ sơ. Hãy xác nhận hoặc sửa lại.' : 'Hồ sơ chưa có địa chỉ. Hãy nhập địa chỉ nhận nấm.'}
              </AppText>
              <AppInput
                label="Số nhà"
                placeholder="Nhập số nhà"
                value={addressParts.houseNumber}
                onChangeText={(houseNumber) => { setAddressParts((current) => ({ ...current, houseNumber })); setError(null); }}
                maxLength={100}
                editable={!saving}
                error={error ?? undefined}
              />
              <AppInput
                label="Tên đường"
                placeholder="Nhập tên đường"
                value={addressParts.street}
                onChangeText={(street) => { setAddressParts((current) => ({ ...current, street })); setError(null); }}
                maxLength={200}
                editable={!saving}
              />
              <AppInput
                label="Phường"
                placeholder="Nhập phường"
                value={addressParts.ward}
                onChangeText={(ward) => { setAddressParts((current) => ({ ...current, ward })); setError(null); }}
                maxLength={200}
                editable={!saving}
              />
              <AppInput
                label="Tỉnh/Thành phố"
                placeholder="Nhập tỉnh/thành phố"
                value={addressParts.province}
                onChangeText={(province) => { setAddressParts((current) => ({ ...current, province })); setError(null); }}
                maxLength={200}
                editable={!saving}
              />
              <AppButton title="Tiếp tục xác nhận địa chỉ" variant="primary" onPress={() => {
                if (Object.values(addressParts).some((part) => !part.trim())) {
                  setError('Vui lòng nhập đầy đủ 4 phần địa chỉ nhận hàng.');
                  return;
                }
                setStep('review');
              }} />
            </AppCard>
          ) : null}

          {step === 'schedule' && method === 'PICKUP' ? (
            <AppCard variant="outlined" style={styles.panel}>
              <AppText variant="bodySmall" weight="bold">Chọn ngày và giờ đến hái nấm</AppText>
              <AppText variant="caption" color={theme.colors.text.secondary}>Ngày nhận từ ngày sẵn sàng thu hoạch đến tối đa 3 ngày sau đó.</AppText>
              <AppText variant="caption" weight="bold">Địa chỉ trang trại</AppText>
              <AppText variant="bodySmall">{farmAddress}</AppText>

              <PickupSchedulePicker
                dates={getCustomerPickupDateKeys(session.harvest_ready_at)}
                date={pickupDate}
                time={pickupTime}
                disabled={saving}
                onChange={(date, time) => { setPickupDate(date); setPickupTime(time); setError(null); }}
              />
              {error ? <AppText variant="caption" color={theme.colors.error.main}>{error}</AppText> : null}
              <AppButton title="Tiếp tục xác nhận lịch" variant="primary" onPress={() => {
                if (!getCustomerPickupDateKeys(session.harvest_ready_at).includes(pickupDate) || !getCustomerPickupTimeOptions(pickupDate).includes(pickupTime)) {
                  setError('Vui lòng chọn ngày và một giờ đến nhận còn hợp lệ.');
                  return;
                }
                setError(null);
                setStep('review');
              }} />
            </AppCard>
          ) : null}

          {step === 'review' && method === 'PICKUP' ? (
            <AppCard variant="outlined" style={styles.panel}>
              <AppText variant="bodySmall" weight="bold">Đến trang trại hái nấm</AppText>
              <AppText variant="caption" color={theme.colors.text.secondary}>Lịch hẹn: {formatVietnamDate(pickupDate)} · {pickupTime}</AppText>
              <AppText variant="caption" color={theme.colors.text.secondary}>Địa chỉ trang trại</AppText>
              <AppText variant="bodySmall" weight="medium">{farmAddress}</AppText>
              <View style={styles.notice}>
                <Ionicons name="time-outline" size={19} color={theme.colors.warning.dark} />
                <AppText variant="caption" color={theme.colors.warning.dark} style={styles.noticeText}>
                  Vui lòng đến hái nấm trong vòng 3 ngày. Nếu quá thời hạn, trang trại sẽ xử lý theo chính sách thu hoạch và giao nhận.
                </AppText>
              </View>
              <AppButton title="Xác nhận đến trang trại" variant="primary" loading={saving} onPress={() => void submit()} />
            </AppCard>
          ) : null}

          {step === 'review' && method === 'DELIVERY' ? (
            <AppCard variant="outlined" style={styles.panel}>
              <AppText variant="bodySmall" weight="bold">Xác nhận lần cuối</AppText>
              <AppText variant="caption" color={theme.colors.text.secondary}>Nấm sẽ được giao đến địa chỉ:</AppText>
              <View style={styles.addressReview}>
                <Ionicons name="location-outline" size={18} color={theme.colors.primary[700]} />
                <AppText variant="bodySmall" style={styles.addressCopy}>{formatAddress(addressParts)}</AppText>
              </View>
              <AppText variant="caption" color={theme.colors.text.secondary}>Địa chỉ này sẽ được lưu cho yêu cầu thu hoạch này. Địa chỉ hồ sơ của bạn không thay đổi.</AppText>
              <AppButton title="Xác nhận địa chỉ và giao nấm" variant="primary" loading={saving} onPress={() => void submit()} />
            </AppCard>
          ) : null}

          {error && step !== 'address' && step !== 'schedule' ? <AppText variant="caption" color={theme.colors.error.main}>{error}</AppText> : null}
          {step !== 'choose' && step !== 'phone' ? <AppButton title="Quay lại" variant="ghost" disabled={saving} onPress={() => {
            setStep(method === 'DELIVERY' && step === 'review' ? 'address' : method === 'PICKUP' && step === 'review' ? 'schedule' : 'choose');
            setError(null);
          }} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Choice({ icon, title, detail, onPress }: { icon: 'location-outline' | 'car-outline'; title: string; detail: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.choice}>
      <View style={styles.choiceIcon}><Ionicons name={icon} size={21} color={theme.colors.primary[700]} /></View>
      <View style={styles.choiceCopy}>
        <AppText variant="bodySmall" weight="bold">{title}</AppText>
        <AppText variant="caption" color={theme.colors.text.secondary}>{detail}</AppText>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.colors.text.muted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background.default },
  header: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, padding: theme.spacing.base, borderBottomWidth: 1, borderBottomColor: theme.colors.border.light, backgroundColor: theme.colors.background.paper },
  headerIcon: { width: 40, height: 40, borderRadius: theme.borderRadius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary[50] },
  headerCopy: { flex: 1, gap: 2 },
  content: { gap: theme.spacing.md, padding: theme.spacing.base, paddingBottom: theme.spacing['2xl'] },
  choice: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, padding: theme.spacing.md, borderRadius: theme.borderRadius.md, borderWidth: 1, borderColor: theme.colors.border.light, backgroundColor: theme.colors.background.paper },
  choiceIcon: { width: 40, height: 40, borderRadius: theme.borderRadius.full, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary[50] },
  choiceCopy: { flex: 1, gap: 3 },
  panel: { gap: theme.spacing.md },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.xs, padding: theme.spacing.sm, borderRadius: theme.borderRadius.sm, backgroundColor: theme.colors.warning.light },
  noticeText: { flex: 1 },
  addressReview: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.xs, padding: theme.spacing.sm, borderRadius: theme.borderRadius.sm, backgroundColor: theme.colors.neutral[50] },
  addressCopy: { flex: 1 },
});
