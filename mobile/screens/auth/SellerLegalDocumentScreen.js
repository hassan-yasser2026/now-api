import React from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS } from '../../constants/colors';
import {
  SELLER_LEGAL_DOCUMENTS,
  SELLER_LEGAL_VERSION,
} from '../../constants/sellerLegalDocuments';

const SellerLegalDocumentScreen = ({ navigation, route }) => {
  const document = SELLER_LEGAL_DOCUMENTS[route?.params?.documentId];

  if (!document) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="رجوع"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-forward" size={23} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>چودي ستار</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>المستند المطلوب غير متاح.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="رجوع"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-forward" size={23} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>چودي ستار</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator
      >
        <View style={styles.documentLabel}>
          <Ionicons name="document-text-outline" size={17} color={COLORS.primary} />
          <Text style={styles.documentLabelText}>مستند البائع</Text>
        </View>
        <Text accessibilityRole="header" style={styles.title}>{document.title}</Text>
        <Text style={styles.version}>الإصدار {SELLER_LEGAL_VERSION}</Text>
        <View style={styles.disclaimer}>
          <Ionicons name="information-circle-outline" size={20} color="#8A5B00" />
          <Text style={styles.disclaimerText}>
            نص تشغيلي أولي للمراجعة، وليس استشارة قانونية أو اعتمادًا للامتثال.
          </Text>
        </View>

        {document.sections.map((section) => (
          <View key={section.heading} style={styles.section}>
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              {section.heading}
            </Text>
            {section.paragraphs.map((paragraph, index) => (
              <Text key={`${section.heading}-${index}`} style={styles.paragraph}>
                {paragraph}
              </Text>
            ))}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '800' },
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', padding: 20, paddingBottom: 40 },
  documentLabel: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  documentLabelText: { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  title: {
    marginTop: 18,
    color: COLORS.textPrimary,
    fontSize: 25,
    fontWeight: '900',
    lineHeight: 35,
    textAlign: 'right',
  },
  version: { marginTop: 7, color: COLORS.textLight, fontSize: 12, textAlign: 'right' },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#F1D9A6',
    borderRadius: 13,
    backgroundColor: '#FFF9E9',
    padding: 13,
  },
  disclaimerText: { flex: 1, color: '#684A13', fontSize: 13, lineHeight: 21, textAlign: 'right' },
  section: {
    marginTop: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    padding: 16,
  },
  sectionTitle: { color: COLORS.primaryDark, fontSize: 16, fontWeight: '800', textAlign: 'right' },
  paragraph: {
    marginTop: 11,
    color: COLORS.textSecondary,
    fontSize: 14,
    lineHeight: 25,
    textAlign: 'right',
  },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  notFoundText: { color: COLORS.textSecondary, fontSize: 15, textAlign: 'center' },
});

export default SellerLegalDocumentScreen;
