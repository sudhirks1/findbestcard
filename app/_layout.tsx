import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { useEffect } from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import 'react-native-reanimated';
import { useAuthStore } from '../store/useAuthStore';
import { useCardStore } from '../store/useCardStore';
import { useSubscriptionStore } from '../store/useSubscriptionStore';
import { registerDeviceToken } from '../utils/api';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotifications(authToken: string) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return;

  try {
    const { data: pushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    await registerDeviceToken(authToken, pushToken);
  } catch (_) {}
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  const { token, _hasHydrated } = useAuthStore();
  const fetchFromServer = useCardStore((s) => s.fetchFromServer);
  const fetchSubs = useSubscriptionStore((s) => s.fetchFromServer);
  const router = useRouter();

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  useEffect(() => {
    if (!loaded || !_hasHydrated) return;
    if (!token) {
      router.replace('/login' as any);
    } else {
      fetchFromServer();
      fetchSubs();
      registerForPushNotifications(token);
    }
  }, [loaded, _hasHydrated, token]);

  if (!loaded || !_hasHydrated) {
    return (
      <View style={styles.splash}>
        <View style={styles.billsRow}>
          <Text style={styles.bill}>💵</Text>
          <Text style={[styles.bill, styles.billRotateLeft]}>💵</Text>
          <Text style={[styles.bill, styles.billRotateRight]}>💵</Text>
        </View>
        <Text style={styles.bigBill}>💵</Text>
        <View style={styles.billsRow}>
          <Text style={[styles.bill, styles.billRotateRight]}>💵</Text>
          <Text style={styles.bill}>💵</Text>
          <Text style={[styles.bill, styles.billRotateLeft]}>💵</Text>
        </View>
        <Text style={styles.title}>FindBestCard</Text>
        <Text style={styles.subtitle}>Maximize every purchase</Text>
      </View>
    );
  }

  return (
    <ThemeProvider value={DarkTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
        <Stack.Screen name="add-card" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="add-subscription" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="card/[id]" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: '#071A0F',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  billsRow: {
    flexDirection: 'row',
    gap: 12,
    opacity: 0.7,
  },
  bill: {
    fontSize: 44,
  },
  billRotateLeft: {
    transform: [{ rotate: '-20deg' }],
  },
  billRotateRight: {
    transform: [{ rotate: '20deg' }],
  },
  bigBill: {
    fontSize: 100,
    marginVertical: 8,
  },
  title: {
    color: '#34D399',
    fontSize: 28,
    fontWeight: '700',
    marginTop: 16,
    letterSpacing: 1,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14,
    marginTop: 4,
  },
});
