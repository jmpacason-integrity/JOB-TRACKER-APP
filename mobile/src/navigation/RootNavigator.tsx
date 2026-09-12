import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../auth/AuthContext";
import { MANAGER_ROLES } from "../types";
import ApprovalsScreen from "../screens/ApprovalsScreen";
import ExpenseCaptureScreen from "../screens/ExpenseCaptureScreen";
import JobDetailScreen from "../screens/JobDetailScreen";
import JobsListScreen from "../screens/JobsListScreen";
import LoginScreen from "../screens/LoginScreen";
import PhotoCaptureScreen from "../screens/PhotoCaptureScreen";
import ScheduleScreen from "../screens/ScheduleScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function JobsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="JobsList" component={JobsListScreen} options={{ title: "Jobs" }} />
      <Stack.Screen name="JobDetail" component={JobDetailScreen} options={{ title: "Job" }} />
      <Stack.Screen name="ExpenseCapture" component={ExpenseCaptureScreen} options={{ title: "Expense" }} />
      <Stack.Screen name="PhotoCapture" component={PhotoCaptureScreen} options={{ title: "Photo" }} />
    </Stack.Navigator>
  );
}

function AppTabs() {
  const { user } = useAuth();
  const isManager = user ? MANAGER_ROLES.includes(user.role) : false;

  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Jobs" component={JobsStack} />
      <Tab.Screen name="Schedule" component={ScheduleScreen} options={{ headerShown: true }} />
      {isManager && (
        <Tab.Screen name="Approvals" component={ApprovalsScreen} options={{ headerShown: true }} />
      )}
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <NavigationContainer>{user ? <AppTabs /> : <LoginScreen />}</NavigationContainer>;
}
