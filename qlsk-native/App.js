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
} from "./app/screens";
import VerifyOTPScreen from "./app/screens/VerifyOTPScreen";
import ProfileScreen from "./app/screens/ProfileScreen";
import ReminderScreen from "./app/screens/ReminderScreen";
import StepCounterScreen from "./app/screens/StepCounterScreen";
import ReminderAlertProvider from "./ReminderAlertProvider";
import { StepCounterProvider } from "./app/contexts/StepCounterContext";
import ExerciseListScreen from "./app/screens/ExerciseListScreen";
import WorkoutScreen from "./app/screens/WorkoutScreen";
import HealthJournalScreen from "./app/screens/HealthJournalScreen";
import HealthJournalListScreen from "./app/screens/HealthJournalListScreen";
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
                options={{ title: "Nhật ký sức khỏe" }}
              />
              <Stack.Screen
                name="HealthJournalListScreen"
                component={HealthJournalListScreen}
                options={{ title: "Danh sách nhật ký" }}
              />
            </Stack.Navigator>
          </NavigationContainer>
        </Provider>
      </ReminderAlertProvider>
    </StepCounterProvider>
  );
}
