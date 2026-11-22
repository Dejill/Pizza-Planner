import { useEffect } from 'react';
import { Platform, useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
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

export default function RootLayout() {
  useServiceWorkerRegistration();
  const scheme = useColorScheme();

  return (
    <>
      <StatusBar style={themeColorForScheme(scheme)} />
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Dough Calculator' }} />
        <Stack.Screen name="cook" options={{ title: 'Cooking Assistant' }} />
        <Stack.Screen name="build" options={{ title: 'Pizza Builder' }} />
      </Stack>
    </>
  );
}
