import React, { useState, useEffect } from "react";
import { View, ActivityIndicator, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { supabase } from "./src/lib/supabase";
import { AuthProvider } from "./src/context/AuthContext";
import { getSkippedLogin, setSkippedLogin, clearSkippedLogin, migrateLocalDataToCloud } from "./src/services/storage";
import DashboardScreen from "./src/screens/DashboardScreen";
import FolderListScreen from "./src/screens/FolderListScreen";
import FolderDetailScreen from "./src/screens/FolderDetailScreen";
import ColorPickerScreen from "./src/screens/ColorPickerScreen";
import AllSwatchesScreen from "./src/screens/AllSwatchesScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import SwatchDetailScreen from "./src/screens/SwatchDetailScreen";
import LoginScreen from "./src/screens/LoginScreen";
import SignupScreen from "./src/screens/SignupScreen";
import { colors } from "./src/theme/ios";

let migrateScheduled = false;

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const stackScreenOptions = {
	headerStyle: { backgroundColor: colors.background },
	headerLargeTitleShadowVisible: false,
	headerTintColor: colors.darkGrey,
	headerTitleStyle: { fontWeight: "600", fontSize: 17 },
	headerBackTitleVisible: false,
	contentStyle: { backgroundColor: colors.background },
	gestureEnabled: false,
};

function DashboardStack() {
	return (
		<Stack.Navigator screenOptions={stackScreenOptions}>
			<Stack.Screen name="Home" component={DashboardScreen} options={{ headerShown: false }} />
			<Stack.Screen
				name="SwatchDetail"
				component={SwatchDetailScreen}
				options={({ route }) => ({
					title: route.params?.swatch?.name || route.params?.swatch?.hex || "Color",
					headerShown: true,
				})}
			/>
			<Stack.Screen
				name="FolderDetail"
				component={FolderDetailScreen}
				options={({ route }) => ({
					title: route.params?.folder?.name || "Folder",
				})}
			/>
			<Stack.Screen
				name="ColorPicker"
				component={ColorPickerScreen}
				options={({ route }) => ({
					title: route.params?.fromHome ? "Extract Colors" : "Extract Color",
				})}
			/>
		</Stack.Navigator>
	);
}

function FoldersStack() {
	return (
		<Stack.Navigator screenOptions={stackScreenOptions}>
			<Stack.Screen name="Back" component={FolderListScreen} options={{ headerShown: false }} />
			<Stack.Screen
				name="FolderDetail"
				component={FolderDetailScreen}
				options={({ route }) => ({
					title: route.params?.folder?.name || "Folder",
				})}
			/>
			<Stack.Screen name="ColorPicker" component={ColorPickerScreen} options={{ title: "Extract Color" }} />
			<Stack.Screen
				name="SwatchDetail"
				component={SwatchDetailScreen}
				options={({ route }) => ({
					title: route.params?.swatch?.name || route.params?.swatch?.hex || "Color",
					headerShown: true,
				})}
			/>
		</Stack.Navigator>
	);
}

function SwatchesStack() {
	return (
		<Stack.Navigator screenOptions={stackScreenOptions}>
			<Stack.Screen name="AllSwatches" component={AllSwatchesScreen} options={{ headerShown: false }} />
			<Stack.Screen
				name="SwatchDetail"
				component={SwatchDetailScreen}
				options={({ route }) => ({
					title: route.params?.swatch?.name || route.params?.swatch?.hex || "Color",
					headerShown: true,
				})}
			/>
		</Stack.Navigator>
	);
}

function SettingsStack() {
	return (
		<Stack.Navigator screenOptions={stackScreenOptions}>
			<Stack.Screen name="SettingsMain" component={SettingsScreen} options={{ headerShown: false }} />
			<Stack.Screen name="Login" component={LoginScreen} options={{ title: "Sign in" }} />
			<Stack.Screen name="Signup" component={SignupScreen} options={{ title: "Sign up" }} />
		</Stack.Navigator>
	);
}

function AuthStack({ onSkip }) {
	return (
		<Stack.Navigator
			screenOptions={{
				...stackScreenOptions,
				headerShown: true,
				title: "",
				headerBackTitle: "Back",
			}}>
			<Stack.Screen name="Login" component={LoginScreen} initialParams={{ onSkip }} options={{ headerShown: false }} />
			<Stack.Screen name="Signup" component={SignupScreen} options={{ title: "Sign up" }} />
		</Stack.Navigator>
	);
}

const tabScreenOptions = {
	tabBarActiveTintColor: colors.darkGrey,
	tabBarInactiveTintColor: colors.systemGray2,
	tabBarStyle: {
		backgroundColor: "rgba(255,255,255,0.95)",
		borderTopWidth: 1,
		borderTopColor: "rgba(58,58,60,0.08)",
		height: Platform.OS === "ios" ? 88 : 72,
		paddingBottom: Platform.OS === "ios" ? 28 : 8,
		paddingTop: 8,
		...Platform.select({
			ios: {
				shadowColor: "#000",
				shadowOffset: { width: 0, height: -2 },
				shadowOpacity: 0.05,
				shadowRadius: 12,
			},
			android: { elevation: 6 },
		}),
	},
	headerShown: false,
};

function MainTabs() {
	return (
		<Tab.Navigator screenOptions={tabScreenOptions}>
			<Tab.Screen
				name="Dashboard"
				component={DashboardStack}
				options={{
					tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size || 24} color={color} />,
					tabBarLabel: "Dashboard",
				}}
			/>
			<Tab.Screen
				name="Folders"
				component={FoldersStack}
				options={{
					tabBarIcon: ({ color, size }) => <Ionicons name="folder" size={size || 24} color={color} />,
					tabBarLabel: "Collections",
				}}
			/>
			<Tab.Screen
				name="Swatches"
				component={SwatchesStack}
				options={{
					tabBarIcon: ({ color, size }) => <Ionicons name="color-palette" size={size || 24} color={color} />,
					tabBarLabel: "Colors",
				}}
			/>
			<Tab.Screen
				name="Settings"
				component={SettingsStack}
				options={{
					tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size || 24} color={color} />,
					tabBarLabel: "Settings",
				}}
			/>
		</Tab.Navigator>
	);
}

function RootNavigator() {
	const [session, setSession] = useState(null);
	const [skipped, setSkipped] = useState(false);
	const [initialized, setInitialized] = useState(false);

	useEffect(() => {
		Promise.all([supabase.auth.getSession(), getSkippedLogin()]).then(
			([
				{
					data: { session: s },
				},
				skippedVal,
			]) => {
				setSession(s);
				setSkipped(skippedVal);
				setInitialized(true);
				if (s && !migrateScheduled) {
					migrateScheduled = true;
					migrateLocalDataToCloud().catch((e) => console.error("Cloud migrate failed:", e));
				}
			},
		);
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, s) => {
			setSession(s);
			if (!s) {
				migrateScheduled = false;
				getSkippedLogin().then(setSkipped);
			} else if (event === "SIGNED_IN" && !migrateScheduled) {
				migrateScheduled = true;
				migrateLocalDataToCloud().catch((e) => console.error("Cloud migrate failed:", e));
			}
		});
		return () => subscription.unsubscribe();
	}, []);

	const handleSkip = () => {
		setSkippedLogin().then(() => setSkipped(true));
	};

	const requestSignIn = () => {
		clearSkippedLogin().then(() => setSkipped(false));
	};

	const handleSignOut = async () => {
		await clearSkippedLogin();
		await supabase.auth.signOut();
	};

	if (!initialized) {
		return (
			<View style={styles.loadingRoot}>
				<ActivityIndicator size="large" color={colors.darkGrey} />
			</View>
		);
	}

	const showMain = session || skipped;

	return (
		<AuthProvider session={session} skipped={skipped} requestSignIn={requestSignIn} signOut={handleSignOut}>
			{showMain ? <MainTabs /> : <AuthStack onSkip={handleSkip} />}
		</AuthProvider>
	);
}

export default function App() {
	return (
		<SafeAreaProvider>
			<StatusBar style="dark" />
			<NavigationContainer>
				<RootNavigator />
			</NavigationContainer>
		</SafeAreaProvider>
	);
}

const styles = StyleSheet.create({
	loadingRoot: {
		flex: 1,
		backgroundColor: colors.background,
		justifyContent: "center",
		alignItems: "center",
	},
});
