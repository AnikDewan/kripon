import '../styles/global.css';

import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';
import { BarChart3, LayoutDashboard, LucideIcon, ReceiptText, Settings } from 'lucide-react-native';

import { bootstrapDatabase } from '@/db';

bootstrapDatabase();

const tabOptions = (label: string, Icon: LucideIcon) => ({
  title: label,
  tabBarIcon: ({ color, size }: { color: ColorValue; size: number }) => <Icon color={color as string} size={size} strokeWidth={2} />,
});

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <Tabs screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#116F6B',
        tabBarInactiveTintColor: '#758697',
        tabBarLabelStyle: { fontWeight: '700', fontSize: 10 },
        tabBarStyle: { borderTopColor: '#DBE5E8', backgroundColor: '#F9FBFB', height: 70, paddingTop: 7 },
      }}>
        <Tabs.Screen name="index" options={tabOptions('Overview', LayoutDashboard)} />
        <Tabs.Screen name="activity" options={tabOptions('Activity', ReceiptText)} />
        <Tabs.Screen name="insights" options={tabOptions('Insights', BarChart3)} />
        <Tabs.Screen name="settings" options={tabOptions('Settings', Settings)} />
        <Tabs.Screen name="import" options={{ href: null }} />
        <Tabs.Screen name="add-transaction" options={{ href: null }} />
        <Tabs.Screen name="budget" options={{ href: null }} />
      </Tabs>
    </SafeAreaProvider>
  );
}
