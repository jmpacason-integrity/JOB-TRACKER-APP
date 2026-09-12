import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/auth/AuthContext";
import RootNavigator from "./src/navigation/RootNavigator";
import { registerForPushNotifications } from "./src/notifications/push";
import { SyncProvider } from "./src/sync/SyncProvider";

function PushRegistration() {
  const { user } = useAuth();
  useEffect(() => {
    if (user) registerForPushNotifications().catch(() => {});
  }, [user]);
  return null;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SyncProvider>
          <PushRegistration />
          <RootNavigator />
          <StatusBar style="auto" />
        </SyncProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
