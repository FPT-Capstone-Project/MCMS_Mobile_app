import React, { useRef, useState } from 'react';
import { AppState, Image, Pressable, View } from 'react-native';
import type { ImagePickerAsset } from 'expo-image-picker';
import { AppModal } from '../../../shared/components/feedback/AppDialog';
import { AppButton, AppCard, AppInput, AppText } from '../../../shared/components';
import { theme } from '../../../core/theme';
import { useAuth } from '../../auth';
import { useConsultationChatQuery, useSendConsultationChatMutation } from '../data/consultation-chat-api';
import { ConsultationPhotoPicker } from './ConsultationPhotoPicker';
import type { ExpertConsultation } from '../domain/entities/expert-consultation';

export function ConsultationChat({ id, expert = false, onUpdate }: { id: number | string; expert?: boolean; onUpdate?: (data: ExpertConsultation) => void }) {
  const { user } = useAuth();
  const userId = String(user?.user_id ?? user?.id);
  const [active, setActive] = useState(AppState.currentState === 'active');
  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setActive(state === 'active'));
    return () => subscription.remove();
  }, []);
  const { data, error: loadError, isFetching, refetch } = useConsultationChatQuery(id, { pollingInterval: active ? 5000 : 0, refetchOnMountOrArgChange: true });
  React.useEffect(() => {
    if (data && !isFetching && !loadError) onUpdate?.(data);
  }, [data, isFetching, loadError, onUpdate]);
  const [send, { isLoading }] = useSendConsultationChatMutation();
  const [message, setMessage] = useState('');
  const [photo, setPhoto] = useState<ImagePickerAsset | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const closed = data?.status === 'CLOSED' || data?.issue_status === 'RESOLVED';
  const canSend = data && !loadError && !closed && (!expert || String(data.expert_id) === userId);
  const submit = async () => {
    if (lock.current || !canSend || (!message.trim() && !photo)) return;
    lock.current = true;
    setError('');
    try {
      await send({ id, message: message.trim(), photo }).unwrap();
      setMessage(''); setPhoto(null);
    } catch {
      setError('Chưa xác nhận gửi thành công. Hãy tải lại để kiểm tra trước khi gửi lại.');
    } finally { lock.current = false; }
  };
  return <AppCard style={{ gap: 12 }}>
    <AppText variant="title" weight="bold">Trao đổi trong yêu cầu</AppText>
    <AppText variant="caption">{closed ? 'Yêu cầu đã hoàn tất. Lịch sử được giữ lại.' : 'Hai bên có thể trao đổi nhiều lần. Gửi tin nhắn không đóng yêu cầu.'}</AppText>
    <AppButton title="Tải lại hội thoại" size="sm" variant="ghost" onPress={() => void refetch()} />
    {!!loadError && <AppText>Không tải được hội thoại. Vui lòng thử lại.</AppText>}
    {!data && !loadError && <AppText>Đang tải hội thoại…</AppText>}
    {data?.messages?.map((item) => {
      const mine = String(item.sender_id) === userId;
      return <View key={item.message_id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '92%', padding: 12, gap: 6, borderRadius: 12, backgroundColor: mine ? theme.colors.primary[50] : theme.colors.neutral[100] }}>
        <AppText variant="caption" weight="bold">{mine ? 'Bạn' : item.sender_name} · {String(item.sender_id) === String(data.expert_id) ? 'Chuyên gia' : 'Trang trại'}</AppText>
        {!!item.message && <AppText selectable>{item.message}</AppText>}
        {item.media_url && <Pressable accessibilityRole="button" accessibilityLabel="Xem ảnh đính kèm" onPress={() => setPreview(item.media_url!)}>
          <Image source={{ uri: item.media_url }} style={{ width: 220, height: 180, borderRadius: 8 }} />
        </Pressable>}
        <AppText variant="caption">{new Date(item.created_at).toLocaleString('vi-VN')}</AppText>
      </View>;
    })}
    {canSend && <>
      <AppInput label="Tin nhắn" placeholder="Nhập phản hồi hoặc cập nhật tình trạng…" multiline maxLength={5000} value={message} onChangeText={setMessage} editable={!isLoading} />
      <ConsultationPhotoPicker photo={photo} onChange={setPhoto} disabled={isLoading} />
      <AppButton title="Gửi tin nhắn" loading={isLoading} disabled={!message.trim() && !photo} onPress={() => void submit()} />
    </>}
    {expert && data && !closed && !canSend && <AppText>Nhận tư vấn để bắt đầu trả lời.</AppText>}
    {!!error && <AppText color={theme.colors.error.dark}>{error}</AppText>}
    <AppModal visible={!!preview} onRequestClose={() => setPreview(null)}>
      <View style={{ flex: 1, padding: 24, paddingTop: 56 }}>
        <AppButton title="Đóng ảnh" onPress={() => setPreview(null)} />
        {preview && <Image source={{ uri: preview }} style={{ flex: 1 }} resizeMode="contain" />}
      </View>
    </AppModal>
  </AppCard>;
}
