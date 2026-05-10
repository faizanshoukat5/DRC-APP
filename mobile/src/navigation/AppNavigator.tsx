import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import type { LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View } from 'react-native';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { useAuthContext } from '../contexts/AuthContext';
import OfflineBanner from '../components/OfflineBanner';

// Screens
import LandingScreen from '../screens/LandingScreen';
import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import PatientDashboardScreen from '../screens/PatientDashboardScreen';
import DoctorDashboardScreen from '../screens/DoctorDashboardScreen';
import AdminDashboardScreen from '../screens/AdminDashboardScreen';
import PendingDoctorScreen from '../screens/PendingDoctorScreen';
import ResultsScreen from '../screens/ResultsScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SelectDoctorScreen from '../screens/SelectDoctorScreen';
import SettingsScreen from '../screens/SettingsScreen';
import FAQScreen from '../screens/FAQScreen';
import DoctorPatientsScreen from '../screens/DoctorPatientsScreen';
import DoctorPatientDetailScreen from '../screens/DoctorPatientDetailScreen';
import ProfileEditScreen from '../screens/ProfileEditScreen';
import AdminDoctorDirectoryScreen from '../screens/AdminDoctorDirectoryScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import FollowUpScreen from '../screens/FollowUpScreen';

// Icons
import { Ionicons } from '@expo/vector-icons';

export type RootStackParamList = {
  Landing: undefined;
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
  MainTabs: undefined;
  Results: { scanId: string };
  SelectDoctor: undefined;
  DoctorPatients: undefined;
  DoctorPatientDetail: { patientId: string };
  ProfileEdit: undefined;
  AdminDoctorDirectory: undefined;
  Notifications: undefined;
  FollowUp: { scanId: string };
  FAQ: undefined;
  PendingDoctor: undefined;
};

// Deep linking — when the user taps the password reset email, the OS opens
// `retinapilot://reset-password` on installed builds. In Expo Go we skip the
// linking config entirely: the dev server URL (`exp://<lan>:8081/--/`) can
// trip up React Navigation's URL parser during state transitions, throwing
// a "missing navigation context" error. The Supabase recovery flow listens
// to the auth event regardless, so deep link config is purely for prod.
const isExpoGo = Constants.appOwnership === 'expo';
const linking: LinkingOptions<RootStackParamList> | undefined = isExpoGo
  ? undefined
  : {
      prefixes: ['retinapilot://', Linking.createURL('/')],
      config: {
        screens: {
          ResetPassword: 'reset-password',
        },
      },
    };

export type MainTabParamList = {
  Dashboard: undefined;
  History: undefined;
  Settings: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function PatientTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'help-circle-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0ea5e9',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen name="Dashboard" component={PatientDashboardScreen} />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function DoctorTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'help-circle-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0ea5e9',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DoctorDashboardScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen name="History" component={HistoryScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function AdminTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Settings') {
            iconName = focused ? 'settings' : 'settings-outline';
          } else {
            iconName = 'help-circle-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#0ea5e9',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={AdminDashboardScreen}
        options={{ tabBarLabel: 'Doctors' }}
      />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function MainTabs() {
  const { role, doctorStatus } = useAuthContext();

  // If doctor is pending, show pending screen
  if (role === 'doctor' && doctorStatus === 'pending') {
    return <PendingDoctorScreen />;
  }

  if (role === 'admin') {
    return <AdminTabs />;
  }

  if (role === 'doctor') {
    return <DoctorTabs />;
  }

  return <PatientTabs />;
}

export default function AppNavigator() {
  const { isLoading, isAuthenticated, isPasswordRecovery } = useAuthContext();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#0ea5e9" />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <OfflineBanner />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {isPasswordRecovery ? (
          // User opened a password-reset email — the only screen they should
          // see until they finish setting a new password.
          <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        ) : !isAuthenticated ? (
          <>
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="SignIn" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="Results" component={ResultsScreen} />
            <Stack.Screen name="SelectDoctor" component={SelectDoctorScreen} />
            <Stack.Screen name="DoctorPatients" component={DoctorPatientsScreen} />
            <Stack.Screen name="DoctorPatientDetail" component={DoctorPatientDetailScreen} />
            <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
            <Stack.Screen name="AdminDoctorDirectory" component={AdminDoctorDirectoryScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="FollowUp" component={FollowUpScreen} />
          </>
        )}
        {/* Register FAQ after the auth branches so it is pushed onto the stack (back works) */}
        <Stack.Screen name="FAQ" component={FAQScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
