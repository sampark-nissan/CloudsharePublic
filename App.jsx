
import React,{useEffect} from 'react';
import { Platform, StatusBar, View, UIManager } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Provider as PaperProvider } from "react-native-paper";
import FontAwesome5 from "react-native-vector-icons/FontAwesome5";
import { theme } from "./src/theme";
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Auth Screens
import LoginScreen from "./src/screens/auth/LoginScreen";
import RegisterScreen from "./src/screens/auth/RegisterScreen";
import ForgotPasswordScreen from "./src/screens/auth/ForgotPasswordScreen";
import AuthLoadingScreen from "./src/screens/auth/AuthLoadingScreen";

// Main Screens
import HomeScreen from "./src/screens/main/HomeScreen";
import GalleryScreen from "./src/screens/main/GalleryScreen";
import UploadScreen from "./src/screens/main/UploadScreen";
import AIToolsScreen from "./src/screens/main/AIToolsScreen";
import ProfileScreen from "./src/screens/main/ProfileScreen";
import FileDetailScreen from "./src/screens/main/FileDetailScreen";
import ShareScreen from "./src/screens/main/ShareScreen";
import EditImageScreen from "./src/screens/main/EditImageScreen";
import NotificationScreen from './src/screens/main/NotificationScreen';
import ChatBotScreen from './src/screens/main/ChatBotScreen';

// Context
import { AuthProvider } from "./src/context/AuthContext";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          switch (route.name) {
            case "Home":
              iconName = focused ? "home" : "home-outline";
              break;
            case "Gallery":
              iconName = focused ? "images" : "images-outline";
              break;
            case "Share":
              iconName = focused ? "share-social" : "share-social-outline";
              break;
            case "AI Tools":
              iconName = focused ? "sparkles" : "sparkles-outline";
              break;
            case "ChatBot":
              iconName = focused ? "chatbubbles" : "chatbubbles-outline";
              break;
          }

          return (
            <View style={{ justifyContent: 'center', alignItems: 'center', top: 5 }}>
              <Ionicons
                name={iconName}
                size={22}
                color="black"
              />
            </View>
          );
        },
        tabBarShowLabel: false,
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          height: 65,
          justifyContent: 'center',
          alignItems: 'center',
          borderTopWidth: 0,
          elevation: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Gallery" component={GalleryScreen} />
      <Tab.Screen name="Share" component={ShareScreen} />
      <Tab.Screen name="AI Tools" component={AIToolsScreen} />
      <Tab.Screen name="ChatBot" component={ChatBotScreen} />
    </Tab.Navigator>
  );
};



const App = () => {

  useEffect(() => {
    if (Platform.OS === 'android') {
      if (UIManager.setLayoutAnimationEnabledExperimental) {
        UIManager.setLayoutAnimationEnabledExperimental(true);
      }
      try {
        const View = require('react-native').View;
        View.defaultProps = View.defaultProps || {};
        View.defaultProps.clickSound = false;
      } catch (e) {
        console.log('Error disabling click sound:', e);
      }
    }
  }, []);

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <NavigationContainer theme={theme}>
            <StatusBar
              barStyle="dark-content"
              backgroundColor="#ffffff"
              translucent={false}
            />
            <Stack.Navigator
              initialRouteName="AuthLoading"
              screenOptions={{
                headerShown: false,
                statusBarColor: "#ffffff",
                statusBarStyle: "dark-content",
              }}
            >
              <Stack.Screen name="AuthLoading" component={AuthLoadingScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Register" component={RegisterScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen name="FileDetail" component={FileDetailScreen} />
              <Stack.Screen name="Share" component={ShareScreen} />
              <Stack.Screen name="EditImage" component={EditImageScreen} />
              <Stack.Screen name="Upload" component={UploadScreen} />
              <Stack.Screen name="ChatBot" component={ChatBotScreen} />
              <Stack.Screen name="Profile" component={ProfileScreen} />
              <Stack.Screen name="Notification" component={NotificationScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
  };
  
export default App;