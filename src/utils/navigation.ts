import { Platform } from 'react-native';
import { router } from 'expo-router';

const WEB_ROUTES: Record<string, string> = {
  '/(auth)/login': '/login',
  '/(auth)/register': '/register',
  '/(tabs)': '/',
  '/(tabs)/groups': '/groups',
  '/(tabs)/workout': '/workout',
  '/(tabs)/checkin': '/checkin',
  '/(tabs)/habits': '/habits',
  '/(tabs)/profile': '/profile',
  '/(tabs)/stats': '/stats',
};

function toWebPath(route: string) {
  return WEB_ROUTES[route] ?? route;
}

export function goToLogin() {
  if (Platform.OS === 'web') {
    window.location.replace('/login');
  } else {
    router.replace('/(auth)/login');
  }
}

export function navigateBack(fallback: string) {
  if (Platform.OS === 'web') {
    window.location.replace(toWebPath(fallback));
    return;
  }
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback as any);
  }
}
