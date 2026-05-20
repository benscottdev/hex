import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView, Switch, Alert, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { clearAllData, isUsingCloudStorage } from "../services/storage";
import { useAuth } from "../context/AuthContext";
import { colors, typography, spacing } from "../theme/ios";

const SETTINGS_KEY = "@hex_settings";

const DEFAULT_SETTINGS = {
	autoSave: false,
	hapticFeedback: true,
};

export default function SettingsScreen({ navigation }) {
	const insets = useSafeAreaInsets();
	const { session, isAuthenticated, isGuest, signOut } = useAuth();
	const [settings, setSettings] = useState(DEFAULT_SETTINGS);
	const [profile, setProfile] = useState(null);
	const [profileLoading, setProfileLoading] = useState(true);
	const [displayNameEdit, setDisplayNameEdit] = useState("");
	const [savingName, setSavingName] = useState(false);
	const [cloudSync, setCloudSync] = useState(false);

	useEffect(() => {
		loadSettings();
	}, []);

	useFocusEffect(
		useCallback(() => {
			loadProfile();
			isUsingCloudStorage().then(setCloudSync);
		}, [session]),
	);

	const loadProfile = async () => {
		setProfileLoading(true);
		try {
			if (!session?.user) {
				setProfile(null);
				setDisplayNameEdit("");
				return;
			}
			const user = session.user;
			const { data: row, error } = await supabase.from("profiles").select("id, email, display_name").eq("id", user.id).single();
			if (error) {
				const fallback = {
					id: user.id,
					email: user.email ?? "",
					display_name: user.user_metadata?.display_name ?? "",
				};
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
		Alert.alert("Sign out", "Your colors and collections stay in your account. Sign in again to access them.", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Sign out",
				style: "destructive",
				onPress: () => signOut(),
			},
		]);
	};

	const handleClearData = () => {
		const message = isAuthenticated
			? "This will permanently delete all folders and colors from your account and this device."
			: "This will delete all folders and colors stored on this device.";
		Alert.alert("Clear all data", message, [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Clear all",
				style: "destructive",
				onPress: async () => {
					try {
						await clearAllData();
						Alert.alert("Done", "All folders and colors have been cleared.");
					} catch {
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

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Account</Text>
				{profileLoading && isAuthenticated ? (
					<View style={styles.settingRow}>
						<ActivityIndicator size="small" color={colors.darkGrey} />
					</View>
				) : isAuthenticated && profile ? (
					<>
						<View style={styles.syncBanner}>
							<Text style={styles.syncBannerText}>{cloudSync ? "Collections sync to your account" : "Connecting…"}</Text>
						</View>
						<View style={styles.infoRow}>
							<Text style={styles.infoLabel}>Email</Text>
							<Text style={styles.infoValue} numberOfLines={1}>
								{profile.email || "—"}
							</Text>
						</View>
						<View style={styles.settingRow}>
							<View style={styles.settingInfo}>
								<Text style={styles.settingLabel}>Display name</Text>
								<TextInput
									style={styles.displayNameInput}
									value={displayNameEdit}
									onChangeText={setDisplayNameEdit}
									onBlur={saveDisplayName}
									placeholder="Your name"
									placeholderTextColor={colors.systemGray2}
									editable={!savingName}
								/>
							</View>
							{savingName && <ActivityIndicator size="small" color={colors.darkGrey} />}
						</View>
						<TouchableOpacity style={styles.accountActionRow} onPress={handleSignOut} activeOpacity={0.7}>
							<Text style={styles.signOutText}>Sign out</Text>
						</TouchableOpacity>
					</>
				) : isGuest ? (
					<>
						<Text style={styles.guestDescription}>
							You're using Hex without an account. Colors and collections are saved only on this device.
						</Text>
						{!isSupabaseConfigured && (
							<Text style={styles.configWarning}>Sign-in requires Supabase env vars in .env (restart the dev server after adding them).</Text>
						)}
						<TouchableOpacity
							style={[styles.primaryButton, !isSupabaseConfigured && styles.buttonDisabled]}
							onPress={() => navigation.navigate("Login")}
							disabled={!isSupabaseConfigured}
							activeOpacity={0.7}>
							<Text style={styles.primaryButtonText}>Sign in</Text>
						</TouchableOpacity>
						<TouchableOpacity
							style={[styles.secondaryButton, !isSupabaseConfigured && styles.buttonDisabled]}
							onPress={() => navigation.navigate("Signup")}
							disabled={!isSupabaseConfigured}
							activeOpacity={0.7}>
							<Text style={styles.secondaryButtonText}>Create account</Text>
						</TouchableOpacity>
					</>
				) : (
					<Text style={styles.guestDescription}>Loading account…</Text>
				)}
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Behavior</Text>
				<View style={styles.settingRow}>
					<View style={styles.settingInfo}>
						<Text style={styles.settingLabel}>Haptic feedback</Text>
						<Text style={styles.settingDescription}>Vibrate on color extraction</Text>
					</View>
					<Switch value={settings.hapticFeedback} onValueChange={() => handleToggle("hapticFeedback")} trackColor={{ false: colors.warmGray, true: colors.darkGrey }} thumbColor={colors.white} />
				</View>
				<View style={[styles.settingRow, styles.settingRowLast]}>
					<View style={styles.settingInfo}>
						<Text style={styles.settingLabel}>Auto-save</Text>
						<Text style={styles.settingDescription}>Automatically save to last used folder</Text>
					</View>
					<Switch value={settings.autoSave} onValueChange={() => handleToggle("autoSave")} trackColor={{ false: colors.warmGray, true: colors.darkGrey }} thumbColor={colors.white} />
				</View>
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>Data</Text>
				<TouchableOpacity style={styles.accountActionRow} onPress={handleClearData} activeOpacity={0.7}>
					<Text style={styles.dangerButtonText}>Clear all folders & colors</Text>
				</TouchableOpacity>
			</View>

			<View style={styles.section}>
				<Text style={styles.sectionTitle}>About</Text>
				<View style={styles.infoRow}>
					<Text style={styles.infoLabel}>Version</Text>
					<Text style={styles.infoValue}>1.0.0</Text>
				</View>
				<View style={styles.infoRow}>
					<Text style={styles.infoLabel}>Sampling</Text>
					<Text style={styles.infoValue}>Linear RGB averaging</Text>
				</View>
				<View style={[styles.infoRow, styles.infoRowLast]}>
					<Text style={styles.infoLabel}>Color space</Text>
					<Text style={styles.infoValue}>sRGB</Text>
				</View>
			</View>

			<View style={styles.footer}>
				<Text style={styles.footerText}>Hex</Text>
				<Text style={styles.footerSubtext}>Color extraction with pigment-based paint mixing</Text>
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
	settingRowLast: { borderBottomWidth: 0 },
	settingInfo: { flex: 1, marginRight: 16 },
	settingLabel: { ...typography.body, fontWeight: "400", color: colors.black },
	settingDescription: { ...typography.footnote, color: colors.systemGray, marginTop: 8 },
	syncBanner: {
		marginHorizontal: spacing.sectionPadding,
		marginBottom: 8,
		paddingVertical: 10,
		paddingHorizontal: 12,
		backgroundColor: colors.backgroundMuted,
		borderRadius: 12,
	},
	syncBannerText: { ...typography.footnote, color: colors.darkGrey },
	guestDescription: {
		...typography.subheadline,
		color: colors.systemGray,
		paddingHorizontal: spacing.sectionPadding,
		marginBottom: 16,
		lineHeight: 22,
	},
	configWarning: {
		...typography.caption1,
		color: colors.destructive,
		paddingHorizontal: spacing.sectionPadding,
		marginBottom: 12,
	},
	primaryButton: {
		marginHorizontal: spacing.sectionPadding,
		marginBottom: 10,
		paddingVertical: 14,
		borderRadius: 14,
		backgroundColor: colors.darkGrey,
		alignItems: "center",
	},
	primaryButtonText: { ...typography.body, fontWeight: "600", color: colors.white },
	secondaryButton: {
		marginHorizontal: spacing.sectionPadding,
		marginBottom: 16,
		paddingVertical: 14,
		borderRadius: 14,
		backgroundColor: colors.backgroundMuted,
		alignItems: "center",
	},
	secondaryButtonText: { ...typography.body, fontWeight: "600", color: colors.darkGrey },
	buttonDisabled: { opacity: 0.45 },
	accountActionRow: {
		paddingVertical: 14,
		alignItems: "center",
		marginHorizontal: spacing.sectionPadding,
		marginBottom: 16,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: "rgba(58,58,60,0.08)",
	},
	signOutText: { ...typography.body, fontWeight: "600", color: colors.destructive },
	dangerButtonText: { ...typography.body, fontWeight: "600", color: colors.destructive },
	displayNameInput: {
		...typography.body,
		color: colors.darkGrey,
		paddingVertical: 4,
		marginTop: 4,
	},
	infoRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingVertical: 12,
		paddingHorizontal: spacing.sectionPadding,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "rgba(58,58,60,0.08)",
	},
	infoRowLast: { borderBottomWidth: 0 },
	infoLabel: { ...typography.body, color: colors.systemGray },
	infoValue: { ...typography.body, fontWeight: "500", color: colors.black, flexShrink: 1, marginLeft: 12 },
	footer: { paddingHorizontal: spacing.listInset, paddingVertical: 32, alignItems: "center" },
	footerText: { ...typography.subheadline, fontWeight: "600", color: colors.black, marginBottom: 4 },
	footerSubtext: { ...typography.caption1, color: colors.systemGray, textAlign: "center" },
});
