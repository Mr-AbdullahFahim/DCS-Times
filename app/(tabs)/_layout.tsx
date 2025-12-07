import { Tabs } from "expo-router";
import React from "react";
import { Platform } from "react-native";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function TabLayout() {
  // We use fixed colors to match the app's specific Blue/White theme
  // defined in your previous screens (#4A90E2 for active, #8F9BB3 for inactive)
  const PRIMARY_COLOR = "#4A90E2";
  const INACTIVE_COLOR = "#8F9BB3";
  const BACKGROUND_COLOR = "#FFFFFF";

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: PRIMARY_COLOR,
        tabBarInactiveTintColor: INACTIVE_COLOR,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: BACKGROUND_COLOR,
          borderTopWidth: 0, // Remove default line
          elevation: 10, // Android shadow
          shadowColor: "#000", // iOS shadow
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          height: Platform.OS === 'ios' ? 88 : 65, // Taller, modern touch area
          paddingTop: 10,
          paddingBottom: Platform.OS === 'ios' ? 28 : 10,
        },
        tabBarLabelStyle: {
          fontWeight: "600",
          fontSize: 11,
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="calendar" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="booking"
        options={{
          title: "",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="book" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: "",
          tabBarIcon: ({ color }) => (
            <IconSymbol size={26} name="paperplane.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}