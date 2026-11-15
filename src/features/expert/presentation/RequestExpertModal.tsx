import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, View } from 'react-native';
import { AppButton, AppInput, AppText } from '../../../shared/components';
import { theme } from '../../../core/theme';
import { operatorConsultationRepository as repository } from '../data/repositories/operator-consultation-repository';
import type { ExpertIssue, ExpertRequestContext } from '../domain/entities/expert-consultation';

export function RequestExpertModal({
  context,
  onClose,
}: {
  context: ExpertRequestContext;
  onClose: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [question, setQuestion] = useState('');
  const [severity, setSeverity] = useState('MEDIUM');
  const [issueType, setIssueType] = useState('DISEASE');
  const [issue, setIssue] = useState<ExpertIssue | null>(null);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const check = async () => {
      setChecking(true);
      setError('');
      try {
        let page = 1;
        let totalPages = 1;
        do {
          const response = await repository.listIssues(page, undefined, context.sessionId);
          const existing = response.data.find(
            (item) =>
              item.status !== 'RESOLVED' &&
              (context.spawnInspectionId
                ? Number(item.spawn_inspection_id) === context.spawnInspectionId
                : Number(item.inspection_id) === context.inspectionId &&
                  Number(item.session_tray_id) === context.sessionTrayId)
          );
          if (existing) {
            if (active) setIssue(existing);
            break;
          }
          totalPages = response.pagination.totalPages;
          page += 1;
        } while (page <= totalPages);
      } catch {
        if (active)
          setError('Không kiểm tra được yêu cầu đã gửi. Vui lòng thử lại trước khi tạo mới.');
      } finally {
        if (active) setChecking(false);
      }
    };
    void check();
    return () => {
      active = false;
    };
  }, [
    context.sessionId,
    context.inspectionId,
    context.spawnInspectionId,
    context.sessionTrayId,
    retry,
  ]);
  const openIssue = (id: number | string) => {
    onClose();
    router.push({ pathname: '/expert-support', params: { issueId: String(id) } });
  };
  const submit = async () => {
    if (lock.current || !title.trim() || !description.trim() || !question.trim()) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const created =
        issue ||
        (await repository.createIssue({
          sessionTrayId: context.sessionTrayId,
          inspectionId: context.inspectionId,
          spawnInspectionId: context.spawnInspectionId,
          title: title.trim(),
          description: description.trim(),
          issueType,
          severity,
        }));
      setIssue(created); // Keep the saved issue if the consultation request fails.
      await repository.request(created.issue_id, question.trim());
      openIssue(created.issue_id);
    } catch {
      setError(
        'Chưa xác nhận được yêu cầu đã gửi. Nếu sự cố đã được lưu, hãy mở chi tiết để kiểm tra và gửi tiếp, tránh tạo trùng.'
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <Modal
      visible
      animationType="slide"
      onRequestClose={() => {
        if (!busy) onClose();
      }}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <AppText variant="h3" weight="bold">
          Nhờ chuyên gia hỗ trợ
        </AppText>
        <AppText variant="bodySmall">
          {context.label} · Phiên #{context.sessionId}
        </AppText>
        <AppText variant="caption" color={theme.colors.text.secondary}>
          Tình trạng và ảnh của báo cáo này được liên kết với yêu cầu. Mô tả rõ dấu hiệu và điều bạn
          cần chuyên gia tư vấn.
        </AppText>
        {checking ? (
          <ActivityIndicator />
        ) : issue ? (
          <>
            <AppText variant="body">Đã có sự cố: {issue.title}</AppText>
            <AppButton
              title="Mở yêu cầu đã lưu"
              onPress={() => openIssue(issue.issue_id)}
              disabled={busy}
            />
          </>
        ) : error ? (
          <AppButton title="Kiểm tra lại" onPress={() => setRetry((value) => value + 1)} />
        ) : (
          <>
            <AppInput
              label="Vấn đề cần hỗ trợ"
              value={title}
              onChangeText={setTitle}
              maxLength={255}
              placeholder="Ví dụ: Nấm xuất hiện đốm bất thường"
            />
            <AppText weight="semibold">Loại vấn đề</AppText>
            <View style={styles.choices}>
              {[
                ['DISEASE', 'Dấu hiệu bệnh'],
                ['CONTAMINATION', 'Nhiễm tạp'],
                ['QUALITY_FAILURE', 'Chất lượng'],
                ['OTHER', 'Khác'],
              ].map(([value, label]) => (
                <AppButton
                  key={value}
                  title={label}
                  size="sm"
                  variant={issueType === value ? 'primary' : 'outline'}
                  onPress={() => setIssueType(value)}
                />
              ))}
            </View>
            <AppText weight="semibold">Mức độ ảnh hưởng</AppText>
            <View style={styles.choices}>
              {[
                ['LOW', 'Nhẹ'],
                ['MEDIUM', 'Vừa'],
                ['HIGH', 'Nghiêm trọng'],
              ].map(([value, label]) => (
                <AppButton
                  key={value}
                  title={label}
                  size="sm"
                  variant={severity === value ? 'primary' : 'outline'}
                  onPress={() => setSeverity(value)}
                />
              ))}
            </View>
            <AppInput
              label="Dấu hiệu quan sát được"
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={5000}
              placeholder="Xuất hiện từ khi nào, phạm vi ảnh hưởng, đã xử lý gì..."
            />
            <AppInput
              label="Câu hỏi cho chuyên gia"
              value={question}
              onChangeText={setQuestion}
              multiline
              maxLength={5000}
              placeholder="Bạn cần chẩn đoán hoặc hướng dẫn xử lý điều gì?"
            />
            <AppButton
              title="Gửi yêu cầu"
              loading={busy}
              disabled={!title.trim() || !description.trim() || !question.trim()}
              onPress={submit}
            />
          </>
        )}
        {!!error && <AppText color={theme.colors.error.dark}>{error}</AppText>}
        <AppButton title="Đóng" variant="ghost" disabled={busy} onPress={onClose} />
      </ScrollView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  content: { padding: 24, paddingTop: 56, paddingBottom: 48, gap: 16 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
