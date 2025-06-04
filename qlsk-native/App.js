import React from "react";
import { Provider } from "react-native-paper";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";

import { theme } from "./app/core/theme";
import {
  StartScreen,
  LoginScreen,
  RegisterScreen,
  ResetPasswordScreen,
  HomeScreen,
  StatisticsScreen,
} from "./app/screens";
import VerifyOTPScreen from "./app/screens/VerifyOTPScreen";
import ProfileScreen from "./app/screens/ProfileScreen";
import ReminderScreen from "./app/screens/ReminderScreen";
import StepCounterScreen from "./app/screens/StepCounterScreen";
import ReminderAlertProvider from "./app/contexts/ReminderAlertProvider";
import { StepCounterProvider } from "./app/contexts/StepCounterContext";
import ExerciseListScreen from "./app/screens/ExerciseListScreen";
import WorkoutScreen from "./app/screens/WorkoutScreen";
import HealthJournalScreen from "./app/screens/HealthJournalScreen";
import HealthJournalListScreen from "./app/screens/HealthJournalListScreen";
import Water from "./app/screens/Water";
import DietGoalScreen from "./app/screens/DietGoalScreen";
import MealPlanGenerationScreen from "./app/screens/MealPlanGenerationScreen";
import MealPlanDetailScreen from "./app/screens/MealPlanDetailScreen";
import MealPlanListScreen from "./app/screens/MealPlanListScreen";
import ExpertListScreen from "./app/screens/ExpertListScreen";
import ClientStatisticsScreen from "./app/screens/ClientStatisticsScreen";
import LinkedClientsScreen from "./app/screens/LinkedClientsScreen";

const Stack = createStackNavigator();

import { makeRedirectUri } from "expo-auth-session";
console.log(makeRedirectUri({ useProxy: true }));

export default function App() {
  return (
    <StepCounterProvider>
      <ReminderAlertProvider>
        <Provider theme={theme}>
          <NavigationContainer>
            <Stack.Navigator
              initialRouteName="StartScreen"
              screenOptions={{
                headerShown: false,
              }}
            >
              <Stack.Screen name="StartScreen" component={StartScreen} />
              <Stack.Screen name="LoginScreen" component={LoginScreen} />
              <Stack.Screen name="RegisterScreen" component={RegisterScreen} />
              <Stack.Screen name="HomeScreen" component={HomeScreen} />
              <Stack.Screen
                name="ResetPasswordScreen"
                component={ResetPasswordScreen}
              />
              <Stack.Screen
                name="VerifyOTPScreen"
                component={VerifyOTPScreen}
              />
              <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
              <Stack.Screen name="ReminderScreen" component={ReminderScreen} />
              <Stack.Screen
                name="StepCounterScreen"
                component={StepCounterScreen}
              />
              <Stack.Screen
                name="ExerciseListScreen"
                component={ExerciseListScreen}
              />
              <Stack.Screen name="WorkoutScreen" component={WorkoutScreen} />
              <Stack.Screen
                name="HealthJournalScreen"
                component={HealthJournalScreen}
              />
              <Stack.Screen
                name="HealthJournalListScreen"
                component={HealthJournalListScreen}
              />
              <Stack.Screen name="Water" component={Water} />
              <Stack.Screen
                name="StatisticsScreen"
                component={StatisticsScreen}
              />
              <Stack.Screen
                name="DietGoal"
                component={DietGoalScreen}
                options={{ title: "Mục tiêu dinh dưỡng" }}
              />
              <Stack.Screen
                name="MealPlanGenerationScreen"
                component={MealPlanGenerationScreen}
                options={{ title: "Tạo thực đơn" }}
              />
              <Stack.Screen
                name="MealPlanDetailScreen"
                component={MealPlanDetailScreen}
                options={{ title: "Chi tiết thực đơn" }}
              />
              <Stack.Screen
                name="MealPlanListScreen"
                component={MealPlanListScreen}
              />
              <Stack.Screen
                name="ExpertListScreen"
                component={ExpertListScreen}
                options={{ title: "Chọn chuyên gia" }}
              />
              <Stack.Screen
                name="ClientStatisticsScreen"
                component={ClientStatisticsScreen}
                options={{ title: "Thống kê người dùng" }}
              />
              <Stack.Screen
                name="LinkedClientsScreen"
                component={LinkedClientsScreen}
                options={{ title: "Người dùng liên kết" }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </Provider>
      </ReminderAlertProvider>
    </StepCounterProvider>
  );
}
