import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuthStore } from '../store/useAuthStore';
import { useCardStore } from '../store/useCardStore';
import { COLORS } from '../utils/constants';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const [error, setError] = useState('');
  const [appleAvailable, setAppleAvailable] = useState(false);
  const router = useRouter();
  const { login, loginWithApple, token } = useAuthStore();
  const fetchFromServer = useCardStore((s) => s.fetchFromServer);

  useEffect(() => {
    if (token) router.replace('/(tabs)');
  }, [token]);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  const afterAuth = async () => {
    await fetchFromServer();
    router.replace('/(tabs)');
  };

  const handleAppleSignIn = async () => {
    setError('');
    setAppleLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      const displayName = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName].filter(Boolean).join(' ')
        : undefined;
      await loginWithApple({
        identityToken: credential.identityToken!,
        appleUserId: credential.user,
        email: credential.email ?? undefined,
        displayName: displayName || undefined,
      });
      await afterAuth();
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        setError(e.message || 'Apple Sign In failed. Please try again.');
      }
    } finally {
      setAppleLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password);
      await afterAuth();
    } catch (e: any) {
      setError(e.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[COLORS.bgGradientStart, COLORS.bgGradientEnd]} style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoArea}>
            <Text style={styles.logoEmoji}>💳</Text>
            <Text style={styles.appName}>FindBestCard</Text>
            <Text style={styles.tagline}>Maximize every purchase</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Welcome back</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Apple Sign In */}
            {appleAvailable && (
              <>
                {appleLoading ? (
                  <View style={styles.appleLoading}>
                    <ActivityIndicator color={COLORS.textPrimary} />
                    <Text style={styles.appleLoadingText}>Signing in with Apple…</Text>
                  </View>
                ) : (
                  <AppleAuthentication.AppleAuthenticationButton
                    buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                    buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                    cornerRadius={22}
                    style={styles.appleBtn}
                    onPress={handleAppleSignIn}
                  />
                )}
                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>
              </>
            )}

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry
                autoComplete="password"
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.btnText}>Sign In</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.link} onPress={() => router.push('/register' as any)}>
              <Text style={styles.linkText}>
                Don't have an account?{' '}
                <Text style={styles.linkHighlight}>Create one</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  kav: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 60,
    gap: 32,
  },
  logoArea: { alignItems: 'center', gap: 8 },
  logoEmoji: { fontSize: 56 },
  appName: { color: COLORS.accentLight, fontSize: 28, fontWeight: '800', letterSpacing: 0.5 },
  tagline: { color: COLORS.textMuted, fontSize: 14 },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    gap: 16,
  },
  title: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  errorBox: {
    backgroundColor: 'rgba(244,63,94,0.12)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.3)',
  },
  errorText: { color: COLORS.red, fontSize: 13, lineHeight: 18 },
  appleBtn: { width: '100%', height: 52 },
  appleLoading: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22,
  },
  appleLoadingText: { color: COLORS.textSecondary, fontSize: 14 },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.surfaceBorder },
  dividerText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  field: { gap: 6 },
  label: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  input: {
    color: COLORS.textPrimary,
    fontSize: 15,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  btn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 16,
    borderRadius: 22,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  link: { alignItems: 'center', paddingVertical: 4 },
  linkText: { color: COLORS.textSecondary, fontSize: 14 },
  linkHighlight: { color: COLORS.accentLight, fontWeight: '700' },
});
