import React, { useState, useEffect } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../lib/supabase";
import { clearAllData, clearSkippedLogin } from "../services/storage";
import { colors, typography, spacing, radius } from "../theme/ios";

const SETTINGS_KEY = "@hex_settings";

const DEFAULT_SETTINGS = {
	autoSave: false,
	hapticFeedback: true,
};

export default function SettingsScreen() {
	const insets = useSafeAreaInsets();
	const [settings, setSettings] = useState(DEFAULT_SETTINGS);
	const [profile, setProfile] = useState(null);
	const [profileLoading, setProfileLoading] = useState(true);
	const [displayNameEdit, setDisplayNameEdit] = useState("");
	const [savingName, setSavingName] = useState(false);

	useEffect(() => {
		loadSettings();
	}, []);

	useEffect(() => {
		loadProfile();
	}, []);

	const loadProfile = async () => {
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				setProfile(null);
				return;
			}
			const { data: row, error } = await supabase.from("profiles").select("id, email, display_name").eq("id", user.id).single();
			if (error) {
				const fallback = { id: user.id, email: user.email ?? "", display_name: user.user_metadata?.display_name ?? "" };
				setProfile(fallback);
				setDisplayNameEdit(fallback.display_name ?? "");
			} else {
				setProfile(row);
				setDisplayNameEdit(row.display_name ?? "");
			}
		} catch (e) {
			console.error("Error loading profile:", e);
		} finally {
			setProfileLoading(false);
		}
	};

	const saveDisplayName = async () => {
		if (profileLoading || !profile?.id || savingName) return;
		setSavingName(true);
		try {
			const { error } = await supabase
				.from("profiles")
				.update({ display_name: displayNameEdit.trim() || null, updated_at: new Date().toISOString() })
				.eq("id", profile.id);
			if (!error) setProfile((p) => ({ ...p, display_name: displayNameEdit.trim() || null }));
		} catch (e) {
			console.error("Error saving display name:", e);
		} finally {
			setSavingName(false);
		}
	};

	const loadSettings = async () => {
		try {
			const savedSettings = await AsyncStorage.getItem(SETTINGS_KEY);
			if (savedSettings) {
				setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
			}
		} catch (error) {
			console.error("Error loading settings:", error);
		}
	};

	const saveSettings = async (newSettings) => {
		try {
			await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(newSettings));
			setSettings(newSettings);
		} catch (error) {
			console.error("Error saving settings:", error);
		}
	};

	const handleToggle = (key) => {
		saveSettings({ ...settings, [key]: !settings[key] });
	};

	const handleSignOut = () => {
		Alert.alert("Sign out", "Are you sure you want to sign out?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Sign out",
				style: "destructive",
				onPress: () => {
					clearSkippedLogin();
					supabase.auth.signOut();
				},
			},
		]);
	};

	const handleClearData = () => {
		Alert.alert("Clear All Data", "This will delete all folders and swatches. This cannot be undone.", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Clear All",
				style: "destructive",
				onPress: async () => {
					try {
						await clearAllData();
						Alert.alert("Success", "All data has been cleared");
					} catch (error) {
						Alert.alert("Error", "Failed to clear data");
					}
				},
			},
		]);
	};

	return (
		<ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.content}>
			<View style={styles.header}>
				<Text style={styles.largeTitle}>Settings</Text>
			</View>

			{/* Account */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Account</Text>
				{profileLoading ? (
					<View style={styles.settingRow}>
						<ActivityIndicator size="small" color={colors.darkGrey} />
					</View>
				) : profile ? (
					<>
						<View style={styles.infoRow}>
							<Text style={styles.infoLabel}>Email</Text>
							<Text style={styles.infoValue} numberOfLines={1}>
								{profile.email || "—"}
							</Text>
						</View>
						<View style={styles.settingRow}>
							<View style={styles.settingInfo}>
								<Text style={styles.settingLabel}>Display name</Text>
								<TextInput style={styles.displayNameInput} value={displayNameEdit} onChangeText={setDisplayNameEdit} onBlur={saveDisplayName} placeholder="Your name" placeholderTextColor={colors.systemGray2} editable={!savingName} />
							</View>
							{savingName && <ActivityIndicator size="small" color={colors.darkGrey} />}
						</View>
						<TouchableOpacity style={styles.signOutButton} onPress={handleSignOut} activeOpacity={0.7}>
							<Text style={styles.signOutButtonText}>Sign out</Text>
						</TouchableOpacity>
					</>
				) : null}
			</View>

			{/* App Behavior */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Behavior</Text>

				<View style={styles.settingRow}>
					<View style={styles.settingInfo}>
						<Text style={styles.settingLabel}>Haptic Feedback</Text>
						<Text style={styles.settingDescription}>Vibrate on color extraction</Text>
					</View>
					<Switch value={settings.hapticFeedback} onValueChange={() => handleToggle("hapticFeedback")} trackColor={{ false: colors.warmGray, true: colors.darkGrey }} thumbColor={colors.white} />
				</View>

				<View style={styles.settingRow}>
					<View style={styles.settingInfo}>
						<Text style={styles.settingLabel}>Auto-Save</Text>
						<Text style={styles.settingDescription}>Automatically save to last used folder</Text>
					</View>
					<Switch value={settings.autoSave} onValueChange={() => handleToggle("autoSave")} trackColor={{ false: colors.warmGray, true: colors.darkGrey }} thumbColor={colors.white} />
				</View>
			</View>

			{/* Data Management */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Data</Text>

				<TouchableOpacity style={styles.dangerButton} onPress={handleClearData} activeOpacity={0.7}>
					<Text style={styles.dangerButtonText}>Clear All Data</Text>
				</TouchableOpacity>
			</View>

			{/* About */}
			<View style={styles.section}>
				<Text style={styles.sectionTitle}>About</Text>

				<View style={styles.infoRow}>
					<Text style={styles.infoLabel}>Version</Text>
					<Text style={styles.infoValue}>1.0.0</Text>
				</View>

				<View style={styles.infoRow}>
					<Text style={styles.infoLabel}>Sampling Method</Text>
					<Text style={styles.infoValue}>Linear RGB Averaging</Text>
				</View>

				<View style={styles.infoRow}>
					<Text style={styles.infoLabel}>Color Space</Text>
					<Text style={styles.infoValue}>sRGB</Text>
				</View>
			</View>

			<View style={styles.footer}>
				<Text style={styles.footerText}>Hex Color Picker</Text>
				<Text style={styles.footerSubtext}>Professional color extraction with accurate paint mixing</Text>
			</View>
		</ScrollView>
	);
}

const sectionShadow = Platform.select({
	ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8 },
	android: { elevation: 3 },
});

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.background },
	content: { paddingBottom: 100 },
	header: { paddingHorizontal: spacing.screenPadding, paddingBottom: 20 },
	largeTitle: { ...typography.largeTitle, color: colors.black },
	section: {
		backgroundColor: colors.white,
		borderRadius: 24,
		marginHorizontal: spacing.listInset,
		marginBottom: 20,
		overflow: "hidden",
		...sectionShadow,
	},
	sectionTitle: {
		...typography.footnote,
		fontWeight: "600",
		color: colors.systemGray,
		textTransform: "uppercase",
		letterSpacing: 0.5,
		marginBottom: 8,
		paddingHorizontal: spacing.sectionPadding,
		paddingTop: 16,
	},
	settingRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: spacing.sectionPadding,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "rgba(58,58,60,0.08)",
	},
	settingInfo: { flex: 1, marginRight: 16 },
	settingLabel: { ...typography.body, fontWeight: "400", color: colors.black },
	settingDescription: { ...typography.footnote, color: colors.systemGray, marginTop: 8 },
	dangerButton: { paddingVertical: 14, alignItems: "center", marginHorizontal: spacing.sectionPadding, marginBottom: 16 },
	dangerButtonText: { ...typography.body, fontWeight: "600", color: colors.darkGrey },
	displayNameInput: {
		...typography.body,
		color: colors.darkGrey,
		paddingVertical: 4,
		paddingHorizontal: 0,
		marginTop: 4,
	},
	signOutButton: { paddingVertical: 14, alignItems: "center", marginHorizontal: spacing.sectionPadding, marginBottom: 16 },
	signOutButtonText: { ...typography.body, fontWeight: "600", color: colors.destructive },
	infoRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingVertical: 12,
		paddingHorizontal: spacing.sectionPadding,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "rgba(58,58,60,0.08)",
	},
	infoLabel: { ...typography.body, color: colors.systemGray },
	infoValue: { ...typography.body, fontWeight: "500", color: colors.black },
	footer: { paddingHorizontal: spacing.listInset, paddingVertical: 32, alignItems: "center" },
	footerText: { ...typography.subheadline, fontWeight: "600", color: colors.black, marginBottom: 4 },
	footerSubtext: { ...typography.caption1, color: colors.systemGray, textAlign: "center" },
});
