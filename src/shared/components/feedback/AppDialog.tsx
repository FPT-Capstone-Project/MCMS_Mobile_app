import { Ionicons } from '@expo/vector-icons';
import React, { createContext, useContext, useEffect, useId, useLayoutEffect, useState, useSyncExternalStore } from 'react';
import {
  AccessibilityInfo, Keyboard, Modal as NativeModal, type ModalProps,
  Pressable, ScrollView, StyleSheet, View,
} from 'react-native';
import { theme } from '../../../core/theme';
import { AppButton } from '../primitives/AppButton';
import { AppText } from '../primitives/AppText';
import { appAlertStore, type AppAlertRequest } from './appAlertStore';

export { AppAlert } from './appAlertStore';
const ModalDepth = createContext(0);

function useAlert(host: string) {
  const state = useSyncExternalStore(appAlertStore.subscribe, appAlertStore.getSnapshot, appAlertStore.getSnapshot);
  const activeHost = state.hosts[state.hosts.length - 1]?.id ?? 'root';
  return activeHost === host ? state.requests[0] : undefined;
}

function appearance(request: AppAlertRequest) {
  if (request.buttons.some((button) => button.style === 'destructive')) {
    return { icon: 'alert-circle-outline' as const, color: theme.colors.error.main, background: theme.colors.error.light };
  }
  if (/lỗi|thất bại|không thể/i.test(request.title)) {
    return { icon: 'close-circle-outline' as const, color: theme.colors.error.main, background: theme.colors.error.light };
  }
  if (/thành công|hoàn tất|hoàn thành|đã lưu|đã hoàn/i.test(request.title)) {
    return { icon: 'checkmark-circle-outline' as const, color: theme.colors.primary[700], background: theme.colors.primary[50] };
  }
  return { icon: 'information-circle-outline' as const, color: theme.colors.primary[700], background: theme.colors.primary[50] };
}

function AlertOverlay({ request }: { request: AppAlertRequest }) {
  const look = appearance(request);
  useEffect(() => {
    Keyboard.dismiss();
    AccessibilityInfo.announceForAccessibility(`${request.title}. ${request.message ?? ''}`);
  }, [request.id, request.title, request.message]);
  const primary = request.buttons.reduce((index, button, next) => button.style === 'cancel' ? index : next, -1);

  return (
    <View style={styles.overlay} accessibilityViewIsModal onAccessibilityEscape={() => appAlertStore.dismiss(request.id)}>
      <Pressable
        style={StyleSheet.absoluteFill}
        accessible={false}
        onPress={() => appAlertStore.dismiss(request.id)}
      />
      <View style={styles.card}>
        <ScrollView bounces={false} contentContainerStyle={styles.copy}>
          <View style={[styles.icon, { backgroundColor: look.background }]}>
            <Ionicons name={look.icon} size={32} color={look.color} />
          </View>
          <AppText variant="title" weight="bold" accessibilityRole="header" style={styles.title}>
            {request.title}
          </AppText>
          {!!request.message && <AppText variant="bodySmall" color={theme.colors.text.secondary} style={styles.message}>{request.message}</AppText>}
          <View style={styles.actions}>
            {request.buttons.map((button, index) => (
              <AppButton
                key={`${request.id}:${index}`}
                title={button.text || 'Đã hiểu'}
                variant={button.style === 'destructive' ? 'danger' : index === primary ? 'primary' : 'outline'}
                fullWidth
                onPress={() => appAlertStore.press(request.id, index)}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

/** Alerts inside an open sheet render in that sheet, above its content on iOS too. */
export function AppModal({ children, visible = true, onRequestClose, ...props }: ModalProps) {
  const id = useId();
  const depth = useContext(ModalDepth);
  const request = useAlert(id);
  useLayoutEffect(() => {
    if (visible) return appAlertStore.registerHost(id, depth);
  }, [id, visible, depth]);

  return (
    <NativeModal {...props} visible={visible} onRequestClose={(event) => {
      if (request) appAlertStore.dismiss(request.id);
      else onRequestClose?.(event);
    }}>
      <View style={styles.modalSurface}>
        <View style={styles.modalSurface} accessibilityElementsHidden={!!request} importantForAccessibility={request ? 'no-hide-descendants' : 'auto'}>
          <ModalDepth.Provider value={depth + 1}>{children}</ModalDepth.Provider>
        </View>
        {request && <AlertOverlay request={request} />}
      </View>
    </NativeModal>
  );
}

/** Mounted once; a short delay lets a closing native sheet finish its transition. */
export function AppAlertHost() {
  const request = useAlert('root');
  const [readyId, setReadyId] = useState<number | null>(null);
  useEffect(() => {
    if (!request) return;
    const timer = setTimeout(() => setReadyId(request.id), 350);
    return () => clearTimeout(timer);
  }, [request]);
  const visible = !!request && readyId === request.id;
  return (
    <NativeModal transparent visible={visible} animationType="fade" statusBarTranslucent onRequestClose={() => {
      if (request) appAlertStore.dismiss(request.id);
    }}>
      {request && <AlertOverlay request={request} />}
    </NativeModal>
  );
}

const styles = StyleSheet.create({
  modalSurface: { flex: 1 },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 1000, backgroundColor: 'rgba(12, 28, 19, 0.48)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 36 },
  card: { width: '100%', maxWidth: 420, maxHeight: '100%', backgroundColor: theme.colors.background.paper, borderRadius: 24, overflow: 'hidden', elevation: 16, shadowColor: '#10251B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24 },
  copy: { padding: 24, gap: 14 },
  icon: { width: 60, height: 60, borderRadius: 20, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  title: { textAlign: 'center' },
  message: { textAlign: 'center', lineHeight: 22 },
  actions: { gap: 10, marginTop: 8 },
});
