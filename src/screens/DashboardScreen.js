import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, Platform, ScrollView, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import SwatchCard from "../components/SwatchCard";
import { getFolders, createFolder, deleteFolder } from "../services/storage";
import { getRecentSwatches } from "../services/storage";
import { colors, typography, spacing, radius } from "../theme/ios";
const SHADOW = Platform.select({
	ios: {
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.06,
		shadowRadius: 12,
	},
	android: { elevation: 4 },
});

export default function DashboardScreen({ navigation }) {
	const insets = useSafeAreaInsets();
	const [recentSwatches, setRecentSwatches] = useState([]);
	const [folders, setFolders] = useState([]);
	const [modalVisible, setModalVisible] = useState(false);
	const [newFolderName, setNewFolderName] = useState("");

	const loadData = async () => {
		const [swatches, loadedFolders] = await Promise.all([getRecentSwatches(20), getFolders()]);
		setRecentSwatches(swatches);
		setFolders(loadedFolders);
	};

	useFocusEffect(
		useCallback(() => {
			loadData();
		}, []),
	);

	const handleCreateFolder = async () => {
		if (!newFolderName.trim()) {
			Alert.alert("Error", "Please enter a folder name");
			return;
		}
		try {
			await createFolder(newFolderName.trim());
			setNewFolderName("");
			setModalVisible(false);
			loadData();
		} catch (error) {
			Alert.alert("Error", "Failed to create folder");
		}
	};

	const handleDeleteFolder = (folder) => {
		Alert.alert("Delete Folder", `Delete "${folder.name}" and its swatches?`, [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: async () => {
					try {
						await deleteFolder(folder.id);
						loadData();
					} catch (error) {
						Alert.alert("Error", "Failed to delete folder");
					}
				},
			},
		]);
	};

	const handleDeleteSwatch = async (swatchId) => {
		try {
			const { deleteSwatch } = await import("../services/storage");
			await deleteSwatch(swatchId);
			loadData();
		} catch (error) {
			Alert.alert("Error", "Failed to delete swatch");
		}
	};

	return (
		<View style={styles.wrapper}>
			<ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
				{/* Your Recents — 50px circles at top */}
				<View style={styles.section}>
					<Text style={[styles.sectionTitle, { paddingHorizontal: spacing.listInset }]}>Your Recents</Text>
					{recentSwatches.length === 0 ? (
						<View style={styles.emptyRecents}>
							<Ionicons name="color-palette-outline" size={40} color={colors.systemGray4} />
							<Text style={styles.emptyRecentsText}>No colors yet</Text>
							<Text style={styles.emptyRecentsSubtext}>Tap Scan to extract from an image</Text>
						</View>
					) : (
						<>
							<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentsRow}>
								{recentSwatches.slice(0, 5).map((swatch) => (
									<View key={swatch.id} style={styles.recentCardWrapper}>
										<SwatchCard
											swatch={swatch}
											onPress={() => navigation.navigate("SwatchDetail", { swatch, showFolder: false })}
											onDelete={() => handleDeleteSwatch(swatch.id)}
											horizontal
										/>
									</View>
								))}
							</ScrollView>
							{recentSwatches.length > 5 && (
								<TouchableOpacity style={styles.viewAllButton} onPress={() => navigation.navigate("Swatches")}>
									<Text style={styles.viewAllText}>View all {recentSwatches.length} colors</Text>
									<Ionicons name="chevron-forward" size={16} color={colors.darkGrey} />
								</TouchableOpacity>
							)}
						</>
					)}
				</View>

				{/* Folders (optional organization) */}
				<View style={styles.section}>
					<View style={styles.sectionHeader}>
						<Text style={styles.sectionTitle}>Folders</Text>
						<TouchableOpacity onPress={() => setModalVisible(true)}>
							<Text style={styles.addFolderText}>+ New</Text>
						</TouchableOpacity>
					</View>
					{folders.length === 0 ? (
						<View style={styles.emptyFolders}>
							<Text style={styles.emptyFoldersText}>Organize colors into folders</Text>
							<TouchableOpacity style={styles.createFolderCTA} onPress={() => setModalVisible(true)}>
								<Text style={styles.createFolderCTAText}>Create Folder</Text>
							</TouchableOpacity>
						</View>
					) : (
						folders.map((folder) => (
							<TouchableOpacity key={folder.id} style={styles.folderCard} onPress={() => navigation.navigate("FolderDetail", { folder })} onLongPress={() => handleDeleteFolder(folder)} activeOpacity={0.9}>
								<View style={styles.folderIcon}>
									<Ionicons name="folder" size={24} color={colors.darkGrey} />
								</View>
								<View style={styles.folderContent}>
									<Text style={styles.folderName}>{folder.name}</Text>
									<Text style={styles.folderMeta}>{new Date(folder.createdAt).toLocaleDateString()}</Text>
								</View>
								<Ionicons name="chevron-forward" size={18} color={colors.darkGrey} />
							</TouchableOpacity>
						))
					)}
				</View>

				{/* New Folder Modal */}
				<Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
					<View style={styles.sheetOverlay}>
						<TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setModalVisible(false)} />
						<View style={[styles.sheet, { paddingBottom: insets.bottom + 24 }]}>
							<View style={styles.sheetHandle} />
							<Text style={styles.sheetTitle}>New Folder</Text>
							<TextInput style={styles.input} placeholder="Folder name" placeholderTextColor={colors.systemGray3} value={newFolderName} onChangeText={setNewFolderName} autoFocus={true} maxLength={30} autoCapitalize="words" />
							<View style={styles.sheetActions}>
								<TouchableOpacity
									style={styles.sheetButton}
									onPress={() => {
										setModalVisible(false);
										setNewFolderName("");
									}}>
									<Text style={styles.sheetButtonCancel}>Cancel</Text>
								</TouchableOpacity>
								<TouchableOpacity style={[styles.sheetButton, styles.sheetButtonPrimary]} onPress={handleCreateFolder}>
									<Text style={styles.sheetButtonPrimaryText}>Create</Text>
								</TouchableOpacity>
							</View>
						</View>
					</View>
				</Modal>
			</ScrollView>

			{/* Floating Extract Button */}
			<TouchableOpacity style={[styles.floatingButton, { bottom: insets.bottom - 20 }]} onPress={() => navigation.navigate("ColorPicker", { fromHome: true })} activeOpacity={0.9}>
				<Ionicons name="camera" size={28} color={colors.darkGrey} />
				<Text style={styles.floatingButtonText}>Extract</Text>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	wrapper: { flex: 1, backgroundColor: colors.background },
	container: { flex: 1 },
	scrollContent: { paddingBottom: 100 },
	section: { marginBottom: 24, width: "100%" },
	sectionHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: spacing.listInset,
		marginBottom: 12,
	},
	sectionTitle: {
		...typography.title3,
		color: colors.black,
		marginBottom: 12,
	},
	recentsRow: {
		flexDirection: "row",
		alignItems: "stretch",
		paddingHorizontal: spacing.listInset,
		gap: 12,
		paddingBottom: 4,
	},
	recentCardWrapper: {
		width: 150,
	},
	addFolderText: {
		...typography.subheadline,
		fontWeight: "600",
		color: colors.darkGrey,
	},
	emptyRecents: {
		alignItems: "center",
		paddingVertical: 32,
		paddingHorizontal: spacing.listInset,
	},
	emptyRecentsText: {
		...typography.body,
		color: colors.systemGray,
		marginTop: 12,
	},
	emptyRecentsSubtext: {
		...typography.footnote,
		color: colors.systemGray3,
		marginTop: 4,
	},
	viewAllButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		paddingVertical: 12,
		marginHorizontal: spacing.listInset,
		marginTop: 8,
		gap: 4,
	},
	viewAllText: {
		...typography.subheadline,
		fontWeight: "600",
		color: colors.darkGrey,
	},
	emptyFolders: {
		marginHorizontal: spacing.listInset,
		padding: 20,
		backgroundColor: colors.white,
		borderRadius: 24,
		alignItems: "center",
		...SHADOW,
	},
	emptyFoldersText: {
		...typography.footnote,
		color: colors.systemGray,
		marginBottom: 12,
	},
	createFolderCTA: {
		paddingVertical: 12,
		paddingHorizontal: 24,
		backgroundColor: colors.yellow,
		borderRadius: 20,
	},
	createFolderCTAText: {
		...typography.subheadline,
		fontWeight: "600",
		color: colors.darkGrey,
	},
	folderCard: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: colors.white,
		marginHorizontal: spacing.listInset,
		marginBottom: 12,
		padding: 16,
		borderRadius: 24,
		...SHADOW,
	},
	folderIcon: {
		width: 44,
		height: 44,
		borderRadius: 16,
		backgroundColor: colors.yellow,
		alignItems: "center",
		justifyContent: "center",
		marginRight: 14,
	},
	folderContent: { flex: 1 },
	folderName: {
		...typography.body,
		fontWeight: "600",
		color: colors.darkGrey,
	},
	folderMeta: {
		...typography.caption1,
		color: "rgba(32,36,44,0.7)",
		marginTop: 2,
	},
	sheetOverlay: { flex: 1, justifyContent: "flex-end" },
	sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
	sheet: {
		backgroundColor: colors.white,
		borderTopLeftRadius: radius.sheet,
		borderTopRightRadius: radius.sheet,
		padding: spacing.sectionPadding,
	},
	detailSheet: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: spacing.sectionPadding,
		maxHeight: "85%",
	},
	sheetHandle: {
		width: 36,
		height: 4,
		borderRadius: 2,
		backgroundColor: colors.systemGray4,
		alignSelf: "center",
		marginBottom: 24,
	},
	sheetTitle: { ...typography.title3, color: colors.black, marginBottom: 16 },
	input: {
		...typography.body,
		backgroundColor: colors.cream,
		borderRadius: 12,
		padding: 14,
		marginBottom: 20,
	},
	sheetActions: { flexDirection: "row", gap: 12 },
	sheetButton: { flex: 1, paddingVertical: 14, alignItems: "center", justifyContent: "center", borderRadius: 16 },
	sheetButtonCancel: { ...typography.body, fontWeight: "600", color: colors.darkGrey },
	sheetButtonPrimary: { backgroundColor: colors.darkGrey, borderRadius: 16 },
	sheetButtonPrimaryText: { ...typography.body, fontWeight: "600", color: colors.white },
	floatingButton: {
		position: "absolute",
		left: spacing.listInset,
		flexDirection: "row",
		alignItems: "center",
		gap: 8,
		backgroundColor: colors.backgroundMuted,
		paddingVertical: 16,
		paddingHorizontal: 24,
		borderRadius: 34,

		...Platform.select({
			ios: {
				shadowColor: "#000",
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.2,
				shadowRadius: 12,
			},
			android: { elevation: 8 },
		}),
	},
	floatingButtonText: {
		...typography.body,
		fontWeight: "600",
		color: colors.darkGrey,
	},
});
