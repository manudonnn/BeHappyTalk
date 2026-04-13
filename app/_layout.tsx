import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#0A0B10' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="index" options={{ animation: 'fade' }} />
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="home" />
        <Stack.Screen name="chat/[id]" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="search" />
        <Stack.Screen name="wallet" />
        <Stack.Screen name="care" />
        <Stack.Screen name="offers" />
        <Stack.Screen name="payment" />
        <Stack.Screen name="permissions" />
      </Stack>
    </>
  );
}
