import { useEffect } from 'react';
import { Tabs, router } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthContext } from '../../src/context/auth.context';
import { colors } from '../../src/utils/theme';

interface TabIconProps {
  emoji: string;
  label: string;
  focused: boolean;
}

function TabIcon({ emoji, label, focused }: TabIconProps) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const { user, isLoading } = useAuthContext();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/(auth)/login');
    }
  }, [user, isLoading]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏠" label="Início" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏋️" label="Treinos" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="checkin"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔥" label="Check-in" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="habits"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🎯" label="Hábitos" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👥" label="Grupos" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="📊" label="Stats" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" label="Perfil" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    height: 72,
    paddingBottom: 8,
    paddingTop: 8,
  },
  tabIcon: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 4,
    opacity: 0.5,
  },
  tabIconFocused: {
    opacity: 1,
  },
  emoji: {
    fontSize: 22,
  },
  tabLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabLabelFocused: {
    color: colors.primary,
    fontWeight: '700',
  },
});
