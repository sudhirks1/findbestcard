import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';
import { COLORS } from '../utils/constants';

export default function SettingsScreen() {
  const router = useRouter();
  const { email, displayName, logout } = useAuthStore();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Your cards will remain cached on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => {
          logout();
          router.replace('/login' as any);
        },
      },
    ]);
  };

  return (
    <LinearGradient colors={[COLORS.bgGradientStart, COLORS.bgGradientEnd]} style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* AI info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Advisor</Text>
          <View style={styles.statusRow}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Powered by FindBestCard cloud</Text>
          </View>
          <Text style={styles.sectionSub}>
            AI questions are answered server-side using your wallet and subscription data. No setup required.
          </Text>
        </View>

        {/* Account section */}
        {email ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            <View style={styles.accountRow}>
              <View style={styles.accountAvatar}>
                <Text style={styles.accountAvatarText}>
                  {(displayName || email)[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                {displayName ? <Text style={styles.accountName}>{displayName}</Text> : null}
                <Text style={styles.accountEmail}>{email}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
              <Text style={styles.logoutBtnText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Privacy note */}
        <View style={styles.privacyBox}>
          <Text style={styles.privacyTitle}>🔒 Privacy</Text>
          <Text style={styles.privacyText}>
            Your wallet and habits are synced to FindBestCard's secure servers so you can access them on any device. Your API key is stored locally only.
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

function Step({ n, text }: { n: string; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { color: COLORS.textPrimary, fontSize: 20 },
  headerTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '700' },
  scroll: { paddingHorizontal: 24, paddingBottom: 60, gap: 24 },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    gap: 12,
  },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '700' },
  sectionSub: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    fontFamily: 'monospace',
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  toggleBtnText: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.green },
  statusText: { color: COLORS.green, fontSize: 13, fontWeight: '600' },
  saveBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 22,
    alignItems: 'center',
  },
  saveBtnText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  clearBtn: { alignItems: 'center', paddingVertical: 8 },
  clearBtnText: { color: COLORS.red, fontSize: 13, fontWeight: '600' },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  accountAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accent + '44',
    borderWidth: 1,
    borderColor: COLORS.accentLight + '55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountAvatarText: { color: COLORS.accentLight, fontSize: 18, fontWeight: '700' },
  accountName: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600' },
  accountEmail: { color: COLORS.textSecondary, fontSize: 13 },
  logoutBtn: {
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.4)',
    paddingVertical: 12,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  logoutBtnText: { color: COLORS.red, fontSize: 14, fontWeight: '700' },
  stepsList: { gap: 10 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.accent + '33',
    borderWidth: 1,
    borderColor: COLORS.accentLight + '55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { color: COLORS.accentLight, fontSize: 12, fontWeight: '800' },
  stepText: { flex: 1, color: COLORS.textSecondary, fontSize: 13, lineHeight: 20, paddingTop: 3 },
  freeNote: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  privacyBox: {
    backgroundColor: 'rgba(52,211,153,0.06)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.accentLight + '22',
    gap: 6,
  },
  privacyTitle: { color: COLORS.accentLight, fontSize: 14, fontWeight: '700' },
  privacyText: { color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 },
});
