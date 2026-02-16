import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import SwatchCard from "../components/SwatchCard";
import { getSwatchesForFolder, getSwatches, deleteSwatch, saveSwatch } from "../services/storage";
import { colors, typography, spacing, radius } from "../theme/ios";

export default function FolderDetailScreen({ route, navigation }) {
	const insets = useSafeAreaInsets();
	const { folder } = route.params;
	const [swatches, setSwatches] = useState([]);
	const [addModalVisible, setAddModalVisible] = useState(false);
	const [candidateSwatches, setCandidateSwatches] = useState([]);

	const loadSwatches = async () => {
		const loadedSwatches = await getSwatchesForFolder(folder.id);
		setSwatches(loadedSwatches);
	};

	const openAddModal = async () => {
		const all = await getSwatches();
		const notInThisFolder = all.filter((s) => s.folderId !== folder.id);
		setCandidateSwatches(notInThisFolder);
		setAddModalVisible(true);
	};

	useFocusEffect(
		useCallback(() => {
			loadSwatches();
		}, [folder.id]),
	);

	React.useLayoutEffect(() => {
		navigation.setOptions({
			title: folder.name,
			headerRight: () => (
				<TouchableOpacity style={styles.headerButton} onPress={openAddModal}>
					<Ionicons name="add" size={22} color={colors.darkGrey} />
					<Text style={styles.headerButtonLabel}>Add</Text>
				</TouchableOpacity>
			),
		});
	}, [navigation, folder]);

	const handleSwatchPress = (swatch) => {
		navigation.navigate("SwatchDetail", { swatch, showFolder: false });
	};

	const handleDeleteSwatch = async (swatchId) => {
		try {
			await deleteSwatch(swatchId);
			loadSwatches();
		} catch (error) {
			Alert.alert("Error", "Failed to delete swatch");
		}
	};

	const handleAddToFolder = async (swatch) => {
		try {
			await saveSwatch({
				folderId: folder.id,
				folderName: folder.name,
				hex: swatch.hex,
				name: swatch.name ?? null,
				rgb: swatch.rgb ?? null,
				sampling: swatch.sampling ?? null,
				mix: swatch.mix ?? null,
			});
			await loadSwatches();
			setCandidateSwatches((prev) => prev.filter((s) => s.id !== swatch.id));
		} catch (error) {
			Alert.alert("Error", "Failed to add color to folder");
		}
	};

	const renderSwatch = ({ item }) => (
		<View style={styles.swatchWrapper}>
			<SwatchCard swatch={item} onPress={() => handleSwatchPress(item)} onDelete={() => handleDeleteSwatch(item.id)} inGrid />
		</View>
	);

	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			{swatches.length === 0 ? (
				<View style={styles.emptyState}>
					<Ionicons name="color-palette-outline" size={48} color={colors.systemGray4} />
					<Text style={styles.emptyTitle}>No Colors</Text>
					<Text style={styles.emptySubtitle}>Tap Add above to choose from your scanned colors.</Text>
				</View>
			) : (
				<FlatList
					data={swatches}
					renderItem={renderSwatch}
					keyExtractor={(item) => item.id}
					numColumns={2}
					columnWrapperStyle={styles.columnWrapper}
					contentContainerStyle={styles.listContent}
					style={styles.list}
					showsVerticalScrollIndicator={false}
				/>
			)}

			<Modal visible={addModalVisible} animationType="slide" transparent onRequestClose={() => setAddModalVisible(false)}>
				<View style={[styles.addModalOverlay, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
					<TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setAddModalVisible(false)} />
					<View style={styles.addModalSheet}>
						<View style={styles.addModalHandle} />
						<View style={styles.addModalHeader}>
							<Text style={styles.addModalTitle}>Add to folder</Text>
							<TouchableOpacity onPress={() => setAddModalVisible(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
								<Text style={styles.addModalDone}>Done</Text>
							</TouchableOpacity>
						</View>
						<Text style={styles.addModalSubtitle}>Choose a color to add to "{folder.name}"</Text>
						{candidateSwatches.length === 0 ? (
							<View style={styles.addModalEmpty}>
								<Text style={styles.addModalEmptyText}>No other colors yet. Extract colors from an image first.</Text>
							</View>
						) : (
							<FlatList
								data={candidateSwatches}
								keyExtractor={(item) => item.id}
								renderItem={({ item }) => (
									<TouchableOpacity style={styles.addModalRow} onPress={() => handleAddToFolder(item)} activeOpacity={0.7}>
										<View style={[styles.addModalSwatch, { backgroundColor: item.hex }]} />
										<View style={styles.addModalRowContent}>
											<Text style={styles.addModalRowLabel} numberOfLines={1}>{item.name || item.hex}</Text>
											{item.name && <Text style={styles.addModalRowHex} numberOfLines={1}>{item.hex}</Text>}
										</View>
										<Ionicons name="add-circle-outline" size={24} color={colors.darkGrey} />
									</TouchableOpacity>
								)}
								contentContainerStyle={styles.addModalList}
								showsVerticalScrollIndicator={false}
							/>
						)}
					</View>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.background },
	list: { flex: 1 },
	listContent: { paddingHorizontal: spacing.listInset, paddingTop: 12, paddingBottom: 100 },
	columnWrapper: { marginBottom: 12, justifyContent: "space-between" },
	swatchWrapper: { width: "48%" },
	emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.listInset, paddingVertical: 60 },
	emptyTitle: { ...typography.title2, color: colors.black, marginTop: 16, marginBottom: 8 },
	emptySubtitle: { ...typography.body, color: colors.systemGray, textAlign: "center" },
	headerButton: { flexDirection: "row", alignItems: "center", gap: 6, marginRight: 8 },
	headerButtonLabel: { ...typography.body, fontWeight: "600", color: colors.darkGrey },
	// Add-to-folder modal
	addModalOverlay: { flex: 1, justifyContent: "flex-end" },
	addModalSheet: {
		backgroundColor: colors.white,
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		paddingHorizontal: spacing.sectionPadding,
		paddingBottom: 24,
		maxHeight: "80%",
	},
	addModalHandle: {
		width: 36,
		height: 4,
		borderRadius: 2,
		backgroundColor: colors.systemGray4,
		alignSelf: "center",
		marginTop: 12,
		marginBottom: 16,
	},
	addModalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
	addModalTitle: { ...typography.title3, color: colors.black },
	addModalDone: { ...typography.body, fontWeight: "600", color: colors.darkGrey },
	addModalSubtitle: { ...typography.footnote, color: colors.systemGray, marginBottom: 16 },
	addModalEmpty: { paddingVertical: 32, alignItems: "center" },
	addModalEmptyText: { ...typography.body, color: colors.systemGray, textAlign: "center" },
	addModalList: { paddingBottom: 24 },
	addModalRow: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: colors.cream,
		borderRadius: 16,
		padding: 12,
		marginBottom: 10,
	},
	addModalSwatch: { width: 44, height: 44, borderRadius: 12, marginRight: 14 },
	addModalRowContent: { flex: 1, minWidth: 0 },
	addModalRowLabel: { ...typography.subheadline, fontWeight: "600", color: colors.black },
	addModalRowHex: { ...typography.caption1, color: colors.systemGray, marginTop: 2 },
});
