import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthContextProvider } from '../src/context/auth.context';
import { colors } from '../src/utils/theme';

export default function RootLayout() {
  return (
    <AuthContextProvider>
      <StatusBar style="light" backgroundColor={colors.background} />
      <Stack screenOptions={{ headerShown: false }} />
    </AuthContextProvider>
  );
}
