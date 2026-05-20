import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, Modal, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { getFolders, createFolder, deleteFolder, getSwatches } from "../services/storage";
import { colors, typography, spacing, radius } from "../theme/ios";

export default function FolderListScreen({ navigation }) {
	const insets = useSafeAreaInsets();
	const [folders, setFolders] = useState([]);
	const [modalVisible, setModalVisible] = useState(false);
	const [newFolderName, setNewFolderName] = useState("");

	const loadFolders = async () => {
		const [loadedFolders, allSwatches] = await Promise.all([getFolders(), getSwatches()]);
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
		}));
		setFolders(withPreviews);
	};

	useFocusEffect(
		useCallback(() => {
			loadFolders();
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
			loadFolders();
		} catch (error) {
			Alert.alert("Error", "Failed to create folder");
		}
	};

	const handleDeleteFolder = (folder) => {
		Alert.alert("Delete Folder", `Are you sure you want to delete "${folder.name}" and all its swatches?`, [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: async () => {
					try {
						await deleteFolder(folder.id);
						loadFolders();
					} catch (error) {
						Alert.alert("Error", "Failed to delete folder");
					}
				},
			},
		]);
	};

	const fourColors = (item) => {
		const list = item.previewColors || [];
		const placeholders = Math.max(0, 4 - list.length);
		return [...list.slice(0, 4), ...Array(placeholders).fill(colors.systemGray6)];
	};

	const renderFolder = ({ item }) => (
		<TouchableOpacity style={styles.cell} onPress={() => navigation.navigate("FolderDetail", { folder: item })} onLongPress={() => handleDeleteFolder(item)} activeOpacity={0.7}>
			<View style={styles.cellIconGrid}>
				{fourColors(item).map((hex, i) => (
					<View key={`${item.id}-${i}-${hex}`} style={[styles.cellIconGridCell, { backgroundColor: hex }]} />
				))}
			</View>
			<View style={styles.cellContent}>
				<Text style={styles.cellTitle}>{item.name}</Text>
				{/* <Text style={styles.cellSubtitle}>{new Date(item.createdAt).toLocaleDateString()}</Text> */}
			</View>
			<Ionicons name="chevron-forward" size={18} color={colors.systemGray3} />
		</TouchableOpacity>
	);

	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			<View style={styles.header}>
				<Text style={styles.largeTitle}>Colors</Text>
				<View style={styles.buttonRow}>
					<TouchableOpacity style={styles.actionButton} onPress={() => setModalVisible(true)} activeOpacity={0.8}>
						<Ionicons name="add" size={18} color={colors.white} />
						<Text style={styles.actionButtonLabel}>New Folder</Text>
					</TouchableOpacity>
					<TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("ColorPicker", { fromHome: true })} activeOpacity={0.8}>
						{/* <Ionicons name="camera" size={18} color={colors.white} /> */}
						<Text style={styles.actionButtonLabel}>Extract</Text>
					</TouchableOpacity>
				</View>
			</View>

			{folders.length === 0 ? (
				<View style={styles.emptyState}>
					<Text style={styles.emptyTitle}>No Folders</Text>
					<Text style={styles.emptySubtitle}>Create a folder to organize your color swatches.</Text>
				</View>
			) : (
				<FlatList data={folders} renderItem={renderFolder} keyExtractor={(item) => item.id} contentContainerStyle={styles.listContent} style={styles.list} scrollIndicatorInsets={{ right: 1 }} />
			)}

			<Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
				<View style={styles.sheetOverlay}>
					<TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setModalVisible(false)} />
					<View style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]}>
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
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.background },
	header: { paddingHorizontal: spacing.screenPadding, paddingBottom: 16 },
	largeTitle: { fontSize: 28, fontWeight: "900", color: colors.darkGrey },
	list: { flex: 1 },
	listContent: { paddingHorizontal: spacing.listInset, paddingBottom: 100 },
	cell: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: colors.white,
		paddingVertical: 16,
		paddingHorizontal: 16,
		minHeight: 56,
		marginBottom: 12,
		borderRadius: 24,
		...Platform.select({
			ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
			android: { elevation: 3 },
		}),
	},
	cellIconGrid: {
		width: 44,
		height: 44,
		// borderRadius: 12,
		marginRight: 14,
		overflow: "hidden",
		flexDirection: "row",
		flexWrap: "wrap",
		gap: 2,
	},
	cellIconGridCell: { width: 20, height: 20, borderRadius: 10 },
	cellContent: { flex: 1, minWidth: 0 },
	cellTitle: { ...typography.title3, fontWeight: "400", color: colors.black },
	cellSubtitle: { ...typography.footnote, color: colors.systemGray, marginTop: 2 },
	buttonRow: { flexDirection: "row", gap: 12, marginTop: 16 },
	actionButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 12,
		height: 50,
		paddingHorizontal: 20,
		borderRadius: 10,
		backgroundColor: colors.ctaOrange,
	},
	actionButtonLabel: { ...typography.body, fontWeight: "600", fontSize: 18, color: colors.white },
	emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.listInset, paddingVertical: 60 },
	emptyTitle: { ...typography.body, color: colors.systemGray, marginBottom: 8 },
	emptySubtitle: { ...typography.footnote, color: colors.systemGray3, textAlign: "center", marginTop: 4 },
	sheetOverlay: { flex: 1, justifyContent: "flex-end" },
	sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
	sheet: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: spacing.sectionPadding,
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
	sheetButton: { flex: 1, paddingVertical: 14, alignItems: "center", justifyContent: "center", borderRadius: 10 },
	sheetButtonCancel: { ...typography.body, fontWeight: "600", color: colors.darkGrey },
	sheetButtonPrimary: { backgroundColor: colors.ctaOrange, borderRadius: 10 },
	sheetButtonPrimaryText: { ...typography.body, fontWeight: "600", fontSize: 18, color: colors.white },
});
