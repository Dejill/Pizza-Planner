import { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { LanguageProvider, useLang } from '@/lib/useLang';
import { themeColorForScheme } from '@/lib/theme';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function useServiceWorkerRegistration() {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }
    navigator.serviceWorker.register('/Pizza-Planner/sw.js').catch(() => undefined);
  }, []);
}

function RootNavigator() {
  const { dict } = useLang();
  const scheme = useColorScheme();

  return (
    <>
      <StatusBar style={themeColorForScheme(scheme)} />
      <Stack>
        <Stack.Screen name="index" options={{ title: dict.calc.heading }} />
        <Stack.Screen name="cook" options={{ title: dict.cook.title }} />
        <Stack.Screen name="build" options={{ title: dict.build.title }} />
        <Stack.Screen name="history" options={{ title: dict.history.title }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useServiceWorkerRegistration();

  return (
    <LanguageProvider>
      <RootNavigator />
    </LanguageProvider>
  );
}
