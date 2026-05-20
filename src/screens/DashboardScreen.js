import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert, Platform, ScrollView, TextInput, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getFolders, createFolder, deleteFolder, getSwatches } from "../services/storage";
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
		const [swatches, loadedFolders, allSwatches] = await Promise.all([getRecentSwatches(20), getFolders(), getSwatches()]);
		setRecentSwatches(swatches);
		const byFolder = {};
		allSwatches.forEach((s) => {
			if (s.folderId) {
				if (!byFolder[s.folderId]) byFolder[s.folderId] = [];
				byFolder[s.folderId].push(s.hex);
			}
		});
		const withPreviews = loadedFolders.map((f) => ({
			...f,
			previewColors: (byFolder[f.id] || []).slice(0, 6),
			count: (byFolder[f.id] || []).length,
		}));
		setFolders(withPreviews);
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
			<View style={[styles.headingView, { marginTop: insets.top + 20 }]}>
				<View style={{ alignItems: "center", justifyContent: "center", width: "100%" }}>
					<Text style={[styles.welcomeHeading]}>Welcome, Ben!</Text>
					<Text style={[styles.welcomeSubHeading]}>What are you creating today?</Text>
				</View>
			</View>

			<View style={styles.floatingButtonContainer}>
				<TouchableOpacity style={styles.floatingButton} onPress={() => navigation.navigate("ColorPicker", { fromHome: true })} activeOpacity={0.9}>
					<Ionicons name="camera" size={28} color={colors.muted} />
					<Text style={styles.floatingButtonText}>Extract a Color!</Text>
				</TouchableOpacity>
			</View>

			<View style={[styles.container, { paddingTop: 24 }]}>
				{/* Your Recents — 50px circles at top */}
				<View style={styles.section}>
					<Text style={[styles.sectionTitle, { backgroundColor: "transparent", paddingHorizontal: spacing.listInset }]}>Your Recents</Text>
					{recentSwatches.length === 0 ? (
						<View style={styles.emptyRecents}>
							<Ionicons name="color-palette-outline" size={40} color={colors.systemGray4} />
							<Text style={styles.emptyRecentsText}>No colors yet</Text>
							<Text style={styles.emptyRecentsSubtext}>Tap scan to extract from an image</Text>
						</View>
					) : (
						<>
							<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentsRow}>
								{recentSwatches.slice(0, 5).map((swatch) => (
									<TouchableOpacity
										key={swatch.id}
										style={[styles.recentCircle, { backgroundColor: swatch.hex }]}
										onPress={() => navigation.navigate("SwatchDetail", { swatch, showFolder: false })}
										onLongPress={() => {
											Alert.alert("Delete Swatch", "Delete this color?", [
												{ text: "Cancel", style: "cancel" },
												{ text: "Delete", style: "destructive", onPress: () => handleDeleteSwatch(swatch.id) },
											]);
										}}
										activeOpacity={0.9}
									/>
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

				<View style={[styles.collectionsSection, folders.length > 0 && { height: "100%" }]}>
					<Text style={[styles.sectionTitle, { backgroundColor: "transparent", paddingHorizontal: spacing.listInset }]}>Collections</Text>
					{folders.length === 0 ? (
						<View style={styles.emptyFolders}>
							<Ionicons name="folder-outline" size={40} color={colors.systemGray4} />
							<Text style={styles.emptyRecentsText}>No collections yet</Text>
							<Text style={styles.emptyRecentsSubtext}>Create collections in the collections tab</Text>
							{/* <TouchableOpacity style={styles.createFolderCTA} onPress={() => setModalVisible(true)}>
								<Text style={styles.createFolderCTAText}>Create Collection</Text>
							</TouchableOpacity> */}
						</View>
					) : (
						<ScrollView style={styles.collectionsScrollView} contentContainerStyle={styles.collectionsScrollContent} showsVerticalScrollIndicator={true} nestedScrollEnabled={true}>
							{folders.map((folder) => {
								const fourColors = [...(folder.previewColors || []).slice(0, 4), ...Array(4 - Math.min(4, (folder.previewColors || []).length)).fill(colors.systemGray6)];
								return (
									<TouchableOpacity key={folder.id} style={styles.folderCard} onPress={() => navigation.navigate("FolderDetail", { folder })} onLongPress={() => handleDeleteFolder(folder)} activeOpacity={0.7}>
										<View style={styles.folderColorGrid}>
											{fourColors.map((hex, i) => (
												<View key={`${folder.id}-${i}-${hex}`} style={[styles.folderColorGridCell, { backgroundColor: hex }]} />
											))}
										</View>
										<View style={styles.folderContent}>
											<Text style={styles.folderName}>{folder.name}</Text>
										</View>
										<Text style={styles.folderCount}>{folder.count ?? 0}</Text>
									</TouchableOpacity>
								);
							})}
						</ScrollView>
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
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	welcomeHeading: {
		fontSize: 28,
		fontWeight: 900,
		color: colors.darkGrey,
	},
	welcomeSubHeading: {
		marginTop: 4,
		fontWeight: 300,
		color: "#c3c3c3",
		fontSize: 16,
	},
	wrapper: { flex: 1, backgroundColor: colors.background },
	container: { flex: 1 },
	scrollContent: { paddingBottom: 100 },
	section: { marginBottom: 24, width: "100%" },
	collectionsSection: {
		width: "100%",
		marginBottom: 24,
	},
	collectionsScrollView: {
		flex: 1,
	},
	collectionsScrollContent: {
		paddingBottom: 8,
	},
	headingView: {
		justifyContent: "space-between",
		// alignItems: "center",
		flexDirection: "row",
		marginHorizontal: spacing.listInset,
	},
	floatingButtonContainer: {
		width: "100%",
		paddingHorizontal: spacing.listInset,
	},
	floatingButton: {
		marginTop: 24,
		height: 50,
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: colors.ctaOrange,
		borderRadius: 10,
		gap: 12,
	},
	floatingButtonText: {
		fontWeight: "600",
		fontSize: 18,
		color: colors.white,
	},
	sectionHeader: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		paddingHorizontal: spacing.listInset,
		marginBottom: 12,
	},
	sectionTitle: {
		textTransform: "uppercase",
		// padding: 8,/
		fontWeight: 900,
		fontSize: 18,
		color: colors.sectionHeading,
		marginBottom: 8,
		borderRadius: 100,
		textAlign: "center",
	},
	recentsRow: {
		paddingHorizontal: spacing.listInset,
		borderRadius: 12,
		width: "100%",
		backgroundColor: "transparent",
		flexDirection: "row",
		justifyContent: "center",
		alignItems: "center",
		paddingVertical: 12,
		gap: 12,
	},
	recentCircle: {
		width: 64,
		height: 64,
		borderRadius: 2100,
		borderWidth: 1,
		borderColor: "rgba(58,58,60,0.18)",
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
		backgroundColor: "transparent",
		borderRadius: 12,
		alignItems: "center",
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
		paddingVertical: 16,
		paddingHorizontal: 16,
		borderRadius: 12,
		minHeight: 56,
		borderWidth: 1,
		borderColor: "rgba(58,58,60,0.08)",
	},
	folderColorGrid: {
		width: 44,
		height: 44,
		marginRight: 14,
		overflow: "hidden",
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 2,
	},
	folderColorGridCell: {
		width: 20,
		height: 20,
		borderRadius: 10,
	},
	folderContent: { flex: 1, minWidth: 0 },
	folderName: {
		...typography.title3,
		fontWeight: 700,
		color: colors.darkGrey,
	},
	folderCount: {
		paddingTop: 3,
		backgroundColor: colors.darkGrey,
		textAlign: "center",
		justifyContent: "center",
		alignItems: "center",
		width: 24,
		height: 24,
		color: colors.warmGray,
		borderRadius: 100,
		fontWeight: "600",
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
	sheetButtonPrimary: { backgroundColor: colors.ctaOrange, borderRadius: 10 },
	sheetButtonPrimaryText: { ...typography.body, fontWeight: "600", color: colors.white },
});
