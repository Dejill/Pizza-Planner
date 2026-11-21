import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Dough Calculator' }} />
        <Stack.Screen name="cook" options={{ title: 'Cooking Assistant' }} />
        <Stack.Screen name="build" options={{ title: 'Pizza Builder' }} />
      </Stack>
    </>
  );
}
