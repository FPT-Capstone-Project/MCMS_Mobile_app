import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { theme } from '../../../../core/theme';
import {
  AppButton,
  AppCard,
  AppDivider,
  AppHeader,
  AppText,
  ScreenContainer,
} from '../../../../shared/components';
import {
  ABOUT_US_INFO,
  POLICIES_DATA,
  PolicyItem,
} from '../../data/policiesData';

/**
 * AboutUsScreen
 * Hiển thị giới thiệu SmartMush và toàn bộ 7 chính sách, điều khoản theo thứ tự chuẩn.
 * Tiêu đề bên trong văn bản hiển thị màu xanh lá + in đậm, nội dung còn lại màu đen.
 */
export const AboutUsScreen: React.FC = () => {
  const router = useRouter();
  const [selectedPolicy, setSelectedPolicy] = useState<PolicyItem | null>(null);

  const handleNextPolicy = () => {
    if (!selectedPolicy) return;
    const currentIndex = POLICIES_DATA.findIndex((p) => p.id === selectedPolicy.id);
    if (currentIndex < POLICIES_DATA.length - 1) {
      setSelectedPolicy(POLICIES_DATA[currentIndex + 1]);
    }
  };

  const handlePrevPolicy = () => {
    if (!selectedPolicy) return;
    const currentIndex = POLICIES_DATA.findIndex((p) => p.id === selectedPolicy.id);
    if (currentIndex > 0) {
      setSelectedPolicy(POLICIES_DATA[currentIndex - 1]);
    }
  };

  /**
   * Render nội dung chính sách:
   * - Dòng tiêu đề: Màu xanh lá, in đậm (bold).
   * - Dòng nội dung bình thường: Màu đen (#000000).
   */
  const renderDocumentContent = (content: string) => {
    const rawLines = content.split('\n');
    const elements: React.ReactNode[] = [];

    rawLines.forEach((line, index) => {
      const trimmed = line.trim();

      // Dòng trống: tạo khoảng cách
      if (!trimmed) {
        elements.push(<View key={`space-${index}`} style={{ height: 6 }} />);
        return;
      }

      // Bỏ qua tiêu đề cấp cao nhất (# ...) vì đã hiển thị ở banner đầu trang
      if (trimmed.startsWith('# ')) {
        return;
      }

      // Xác định các dòng là tiêu đề / đề mục
      const isLevel2Header = /^(##\s*)?(\d+\.\s+[^\n]+)/.test(trimmed);
      const isSubHeader = /^(###\s*)?(\d+\.\d+\.?\s+[^\n]+)/.test(trimmed);
      const isStepOrStage = /^(Bước\s+\d+:|Giai đoạn\s+\d+:)/i.test(trimmed);
      const isSpecialHeader =
        /^(Bảng trạng thái|Quy trình giải quyết|Thời gian xử lý dự kiến|Hình thức nhận hàng|Các trường hợp|Nguyên tắc xác định)/i.test(
          trimmed
        ) && trimmed.length < 60;
      const isMarkdownHeader = trimmed.startsWith('## ') || trimmed.startsWith('### ');

      const isTitle =
        isLevel2Header || isSubHeader || isStepOrStage || isSpecialHeader || isMarkdownHeader;

      if (isTitle) {
        const cleanTitleText = trimmed
          .replace(/^(###?\s*|\*\*)/, '')
          .replace(/\*\*$/, '')
          .trim();
        const isMajor = isLevel2Header || trimmed.startsWith('## ');

        elements.push(
          <View
            key={`title-${index}`}
            style={[
              styles.titleLineWrapper,
              isMajor ? styles.majorTitleWrapper : styles.subTitleWrapper,
            ]}
          >
            <AppText
              variant={isMajor ? 'subtitle' : 'bodyMedium'}
              weight="bold"
              color={theme.colors.primary[700]}
              style={styles.greenTitleText}
            >
              {cleanTitleText}
            </AppText>
          </View>
        );
        return;
      }

      // Dòng gạch đầu dòng (bullet points)
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const bulletText = trimmed.substring(2).trim();
        elements.push(
          <View key={`bullet-${index}`} style={styles.bulletRow}>
            <View style={styles.bulletDot} />
            <AppText variant="bodySmall" color="#000000" style={styles.bulletBlackText}>
              {bulletText.replace(/\*\*/g, '')}
            </AppText>
          </View>
        );
        return;
      }

      // Dòng ghi chú / Lưu ý
      if (trimmed.startsWith('Lưu ý:') || trimmed.startsWith('**Lưu ý:**')) {
        const noteBody = trimmed.replace(/^\*?\*?Lưu ý:\*?\*?\s*/, '').replace(/\*\*/g, '');
        elements.push(
          <View key={`note-${index}`} style={styles.noteCallout}>
            <Ionicons name="information-circle" size={18} color={theme.colors.primary[700]} />
            <AppText variant="captionMedium" color="#000000" style={styles.noteBlackText}>
              <AppText variant="captionMedium" weight="bold" color={theme.colors.primary[700]}>
                Lưu ý:{' '}
              </AppText>
              {noteBody}
            </AppText>
          </View>
        );
        return;
      }

      // Dòng nội dung thông thường: màu đen
      elements.push(
        <AppText
          key={`prose-${index}`}
          variant="bodySmall"
          color="#000000"
          style={styles.proseBlackText}
        >
          {trimmed.replace(/\*\*/g, '')}
        </AppText>
      );
    });

    return elements;
  };

  return (
    <ScreenContainer scrollable edges={['left', 'right']}>
      <AppHeader
        title="Về chúng tôi"
        subtitle="Chính sách, điều khoản & Giới thiệu"
        showBack
        onBack={() => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)/profile');
          }
        }}
      />

      <View style={styles.container}>
        {/* Company Overview Hero Card */}
        <AppCard elevation="sm" style={styles.heroCard}>
          <View style={styles.brandBadge}>
            <Ionicons name="leaf" size={14} color={theme.colors.primary[700]} />
            <AppText variant="overline" color={theme.colors.primary[700]} weight="bold">
              HỆ SINH THÁI NÔNG NGHIỆP THÔNG MINH
            </AppText>
          </View>

          <AppText variant="h2" weight="bold" style={styles.brandTitle}>
            {ABOUT_US_INFO.name}
          </AppText>

          <AppText variant="captionMedium" color={theme.colors.primary[600]} style={styles.brandSubtitle}>
            {ABOUT_US_INFO.systemName}
          </AppText>

          <AppText variant="bodySmall" color={theme.colors.text.secondary} style={styles.brandDescription}>
            {ABOUT_US_INFO.description}
          </AppText>

          <AppDivider spacing="sm" />

          {/* Highlights 2x2 Grid */}
          <View style={styles.highlightsGrid}>
            {ABOUT_US_INFO.highlights.map((item, index) => (
              <View key={index} style={styles.highlightItem}>
                <View style={styles.highlightIconWrapper}>
                  <Ionicons name={item.icon as any} size={18} color={theme.colors.primary[600]} />
                </View>
                <View style={styles.highlightTextContainer}>
                  <AppText variant="label" weight="bold" color={theme.colors.text.primary}>
                    {item.title}
                  </AppText>
                  <AppText variant="caption" color={theme.colors.text.muted}>
                    {item.description}
                  </AppText>
                </View>
              </View>
            ))}
          </View>
        </AppCard>

        {/* Section Header */}
        <View style={styles.sectionHeaderRow}>
          <View>
            <AppText variant="title" weight="bold">
              Chính sách & Điều khoản
            </AppText>
            <AppText variant="caption" color={theme.colors.text.muted}>
              Ngày cập nhật: 13/11/2026
            </AppText>
          </View>
        </View>

        {/* Policies List - Tất cả 7 chính sách hiển thị trực tiếp theo thứ tự chuẩn */}
        <View style={styles.policiesList}>
          {POLICIES_DATA.map((policy, index) => (
            <AppCard
              key={policy.id}
              elevation="xs"
              style={styles.policyCard}
              onPress={() => setSelectedPolicy(policy)}
            >
              <View style={styles.policyCardHeader}>
                <View style={styles.policyIconBox}>
                  <Ionicons name={policy.icon as any} size={22} color={theme.colors.primary[600]} />
                </View>
                <View style={styles.policyTitleArea}>
                  <View style={styles.policyBadgeRow}>
                    <View style={styles.policyBadge}>
                      <AppText variant="overline" color={theme.colors.primary[700]} weight="medium">
                        {policy.badge}
                      </AppText>
                    </View>
                    <AppText variant="overline" color={theme.colors.text.muted}>
                      {policy.effectiveDate}
                    </AppText>
                  </View>
                  <AppText variant="bodyMedium" weight="bold" color={theme.colors.text.primary}>
                    {index + 1}. {policy.title}
                  </AppText>
                </View>
              </View>

              <AppText variant="bodySmall" color={theme.colors.text.secondary} style={styles.policySummary}>
                {policy.summary}
              </AppText>

              <AppDivider spacing="xs" />

              <View style={styles.policyCardFooter}>
                <View style={styles.readMoreLeft}>
                  <Ionicons name="document-text-outline" size={15} color={theme.colors.primary[600]} />
                  <AppText variant="captionMedium" color={theme.colors.primary[600]} weight="bold">
                    Xem toàn văn chính sách
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={16} color={theme.colors.primary[600]} />
              </View>
            </AppCard>
          ))}
        </View>

        {/* Contact Info Card */}
        <AppCard elevation="none" variant="filled" style={styles.contactCard}>
          <View style={styles.contactHeader}>
            <Ionicons name="business-outline" size={20} color={theme.colors.primary[600]} />
            <AppText variant="subtitle" weight="bold" style={styles.contactTitle}>
              Thông tin liên hệ & Hỗ trợ
            </AppText>
          </View>

          <View style={styles.contactItem}>
            <Ionicons name="person-outline" size={16} color={theme.colors.text.muted} style={{ marginTop: 2 }} />
            <AppText variant="bodySmall" color={theme.colors.text.secondary} style={styles.contactItemText}>
              Đơn vị vận hành: <AppText variant="bodySmall" weight="bold">{ABOUT_US_INFO.contact.entity}</AppText>
            </AppText>
          </View>

          <View style={styles.contactItem}>
            <Ionicons name="mail-outline" size={16} color={theme.colors.text.muted} style={{ marginTop: 2 }} />
            <AppText variant="bodySmall" color={theme.colors.text.secondary} style={styles.contactItemText}>
              Email hỗ trợ: {ABOUT_US_INFO.contact.email}
            </AppText>
          </View>

          <View style={styles.contactItem}>
            <Ionicons name="call-outline" size={16} color={theme.colors.text.muted} style={{ marginTop: 2 }} />
            <AppText variant="bodySmall" color={theme.colors.text.secondary} style={styles.contactItemText}>
              Số điện thoại: {ABOUT_US_INFO.contact.phone}
            </AppText>
          </View>

          <View style={styles.contactItem}>
            <Ionicons name="location-outline" size={16} color={theme.colors.text.muted} style={{ marginTop: 2 }} />
            <AppText variant="bodySmall" color={theme.colors.text.secondary} style={styles.contactItemText}>
              Địa chỉ: {ABOUT_US_INFO.contact.address}
            </AppText>
          </View>
        </AppCard>

        <AppText variant="caption" color={theme.colors.text.muted} align="center" style={styles.footerNote}>
          © 2026 SmartMush • Mọi quyền được bảo lưu
        </AppText>
      </View>

      {/* Reader Modal for Full Policy Document */}
      <Modal
        visible={Boolean(selectedPolicy)}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedPolicy(null)}
      >
        {selectedPolicy ? (
          <View style={styles.readerContainer}>
            {/* Reader Header */}
            <View style={styles.readerHeader}>
              <View style={styles.readerHeaderLeft}>
                <View style={styles.readerBadge}>
                  <Ionicons name={selectedPolicy.icon as any} size={14} color={theme.colors.primary[700]} />
                  <AppText variant="overline" color={theme.colors.primary[700]} weight="bold">
                    {selectedPolicy.badge}
                  </AppText>
                </View>
                <AppText variant="subtitle" weight="bold" numberOfLines={2}>
                  {selectedPolicy.title}
                </AppText>
              </View>

              <Pressable
                style={styles.closeBtn}
                onPress={() => setSelectedPolicy(null)}
                accessibilityRole="button"
                accessibilityLabel="Đóng văn bản"
              >
                <Ionicons name="close" size={24} color={theme.colors.text.primary} />
              </Pressable>
            </View>

            <AppDivider spacing="none" />

            {/* Reader Scrollable Document Body */}
            <ScrollView
              style={styles.readerScroll}
              contentContainerStyle={styles.readerContent}
              showsVerticalScrollIndicator
            >
              <View style={styles.docHeaderBanner}>
                <AppText variant="h3" weight="bold" color={theme.colors.primary[800]} align="center">
                  {selectedPolicy.documentTitle}
                </AppText>
                <AppText variant="captionMedium" color={theme.colors.text.secondary} align="center" style={{ marginTop: 4 }}>
                  {selectedPolicy.subtitle}
                </AppText>
                <View style={styles.dateChip}>
                  <Ionicons name="calendar-outline" size={13} color={theme.colors.text.muted} />
                  <AppText variant="caption" color={theme.colors.text.muted}>
                    Ngày hiệu lực: {selectedPolicy.effectiveDate}
                  </AppText>
                </View>
              </View>

              <AppDivider spacing="md" />

              {/* Document Text Rendering: Tiêu đề xanh lá + in đậm, còn lại màu đen */}
              <View style={styles.documentBody}>
                {renderDocumentContent(selectedPolicy.content)}
              </View>

              {/* Document Contact Footer */}
              <View style={styles.docFooterBox}>
                <AppText variant="caption" weight="bold" color={theme.colors.primary[800]}>
                  {ABOUT_US_INFO.systemName}
                </AppText>
                <AppText variant="caption" color={theme.colors.text.muted} align="center" style={{ marginTop: 2 }}>
                  Mọi thắc mắc về văn bản này, xin vui lòng gửi email về {ABOUT_US_INFO.contact.email} hoặc hotline {ABOUT_US_INFO.contact.phone}.
                </AppText>
              </View>
            </ScrollView>

            {/* Reader Footer Actions */}
            <View style={styles.readerFooter}>
              <View style={styles.readerNavRow}>
                <Pressable
                  style={[
                    styles.readerNavBtn,
                    POLICIES_DATA.findIndex((p) => p.id === selectedPolicy.id) === 0 &&
                      styles.readerNavBtnDisabled,
                  ]}
                  onPress={handlePrevPolicy}
                  disabled={POLICIES_DATA.findIndex((p) => p.id === selectedPolicy.id) === 0}
                >
                  <Ionicons name="chevron-back" size={18} color={theme.colors.primary[600]} />
                  <AppText variant="captionMedium" color={theme.colors.primary[600]}>
                    Trước
                  </AppText>
                </Pressable>

                <AppText variant="caption" color={theme.colors.text.muted}>
                  {POLICIES_DATA.findIndex((p) => p.id === selectedPolicy.id) + 1} / {POLICIES_DATA.length}
                </AppText>

                <Pressable
                  style={[
                    styles.readerNavBtn,
                    POLICIES_DATA.findIndex((p) => p.id === selectedPolicy.id) ===
                      POLICIES_DATA.length - 1 && styles.readerNavBtnDisabled,
                  ]}
                  onPress={handleNextPolicy}
                  disabled={
                    POLICIES_DATA.findIndex((p) => p.id === selectedPolicy.id) ===
                    POLICIES_DATA.length - 1
                  }
                >
                  <AppText variant="captionMedium" color={theme.colors.primary[600]}>
                    Tiếp theo
                  </AppText>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.primary[600]} />
                </Pressable>
              </View>

              <AppButton
                title="Đã đọc và hiểu"
                variant="primary"
                size="md"
                onPress={() => setSelectedPolicy(null)}
                style={styles.closeFullBtn}
              />
            </View>
          </View>
        ) : null}
      </Modal>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing['2xl'],
    gap: theme.spacing.base,
  },
  heroCard: {
    backgroundColor: theme.colors.neutral[0],
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.primary[100],
    padding: theme.spacing.lg,
  },
  brandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    marginBottom: theme.spacing.xs,
  },
  brandTitle: {
    color: theme.colors.primary[800],
  },
  brandSubtitle: {
    marginTop: 2,
    marginBottom: theme.spacing.sm,
  },
  brandDescription: {
    lineHeight: 20,
  },
  highlightsGrid: {
    gap: theme.spacing.md,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
  },
  highlightIconWrapper: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.full,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  highlightTextContainer: {
    flex: 1,
    gap: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  countBadge: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.primary[200],
  },
  policiesList: {
    gap: theme.spacing.sm,
  },
  policyCard: {
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.neutral[0],
    padding: theme.spacing.md,
  },
  policyCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  policyIconBox: {
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.md,
    backgroundColor: theme.colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
  },
  policyTitleArea: {
    flex: 1,
    gap: 2,
  },
  policyBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  policyBadge: {
    backgroundColor: theme.colors.primary[50],
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.xs,
  },
  policySummary: {
    lineHeight: 18,
    marginTop: 4,
  },
  policyCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  readMoreLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactCard: {
    backgroundColor: theme.colors.neutral[50],
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    marginBottom: 4,
  },
  contactTitle: {
    flex: 1,
    flexWrap: 'wrap',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.xs,
  },
  contactItemText: {
    flex: 1,
    flexWrap: 'wrap',
    lineHeight: 20,
  },
  footerNote: {
    marginTop: theme.spacing.xs,
  },

  // Reader Modal Styles
  readerContainer: {
    flex: 1,
    backgroundColor: theme.colors.neutral[0],
  },
  readerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.neutral[0],
  },
  readerHeaderLeft: {
    flex: 1,
    gap: 2,
    marginRight: theme.spacing.sm,
  },
  readerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary[50],
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: theme.borderRadius.xs,
  },
  closeBtn: {
    padding: 6,
  },
  readerScroll: {
    flex: 1,
  },
  readerContent: {
    paddingHorizontal: theme.spacing.base,
    paddingTop: theme.spacing.base,
    paddingBottom: theme.spacing['3xl'],
  },
  docHeaderBanner: {
    alignItems: 'center',
    backgroundColor: theme.colors.neutral[50],
    padding: theme.spacing.base,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.neutral[0],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.full,
    borderWidth: 1,
    borderColor: theme.colors.neutral[300],
    marginTop: theme.spacing.sm,
  },
  documentBody: {
    gap: 2,
  },
  titleLineWrapper: {
    marginTop: theme.spacing.sm,
    marginBottom: 4,
  },
  majorTitleWrapper: {
    marginTop: theme.spacing.md,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.primary[100],
  },
  subTitleWrapper: {
    marginTop: theme.spacing.xs,
  },
  greenTitleText: {
    color: theme.colors.primary[700],
    fontWeight: 'bold',
  },
  proseBlackText: {
    color: '#000000',
    lineHeight: 22,
    marginVertical: 2,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingLeft: 6,
    marginVertical: 2,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary[600],
    marginTop: 8,
  },
  bulletBlackText: {
    color: '#000000',
    flex: 1,
    lineHeight: 22,
  },
  noteCallout: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.primary[50],
    borderColor: theme.colors.primary[200],
    borderWidth: 1,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    marginVertical: 6,
  },
  noteBlackText: {
    color: '#000000',
    flex: 1,
    lineHeight: 20,
  },
  docFooterBox: {
    marginTop: theme.spacing.xl,
    padding: theme.spacing.base,
    backgroundColor: theme.colors.primary[50],
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  readerFooter: {
    paddingHorizontal: theme.spacing.base,
    paddingVertical: theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.neutral[200],
    backgroundColor: theme.colors.neutral[0],
    gap: theme.spacing.xs,
  },
  readerNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  readerNavBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  readerNavBtnDisabled: {
    opacity: 0.3,
  },
  closeFullBtn: {
    marginTop: 2,
  },
});
