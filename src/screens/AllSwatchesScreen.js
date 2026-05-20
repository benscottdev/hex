import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import SwatchCard from "../components/SwatchCard";
import { getSwatches, deleteSwatch } from "../services/storage";
import { colors, typography, spacing, radius } from "../theme/ios";

export default function AllSwatchesScreen({ navigation }) {
	const insets = useSafeAreaInsets();
	const [swatches, setSwatches] = useState([]);

	const loadSwatches = async () => {
		const loadedSwatches = await getSwatches();
		// Sort by most recent first
		loadedSwatches.sort((a, b) => b.createdAt - a.createdAt);
		setSwatches(loadedSwatches);
	};

	useFocusEffect(
		useCallback(() => {
			loadSwatches();
		}, []),
	);

	const handleSwatchPress = (swatch) => {
		navigation.navigate("SwatchDetail", { swatch, showFolder: true });
	};

	const handleDeleteSwatch = async (swatchId) => {
		try {
			await deleteSwatch(swatchId);
			loadSwatches();
		} catch (error) {
			Alert.alert("Error", "Failed to delete swatch");
		}
	};

	const renderSwatch = ({ item }) => (
		<View style={styles.swatchWrapper}>
			<SwatchCard swatch={item} onPress={() => handleSwatchPress(item)} onDelete={() => handleDeleteSwatch(item.id)} inGrid />
		</View>
	);

	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			<View style={styles.header}>
				<Text style={styles.largeTitle}>Your Swatches </Text>
				{/* <Text style={styles.subtitle}>
					{swatches.length} {swatches.length === 1 ? "color" : "colors"}
				</Text> */}
			</View>

			{swatches.length === 0 ? (
				<View style={styles.emptyState}>
					<Ionicons name="color-palette-outline" size={48} color={colors.systemGray4} />
					<Text style={styles.emptyTitle}>No Swatches</Text>
					<Text style={styles.emptySubtitle}>Extract colors from images to see them here.</Text>
				</View>
			) : (
				<FlatList data={swatches} renderItem={renderSwatch} keyExtractor={(item) => item.id} numColumns={2} columnWrapperStyle={styles.columnWrapper} contentContainerStyle={styles.listContent} style={styles.list} showsVerticalScrollIndicator={false} />
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.background },
	header: { paddingHorizontal: spacing.screenPadding, paddingBottom: 8 },
	largeTitle: { fontSize: 28, fontWeight: "900", color: colors.darkGrey, textAlign: "center" },
	subtitle: { ...typography.subheadline, color: colors.systemGray, marginTop: 4 },
	list: { flex: 1 },
	listContent: { paddingHorizontal: spacing.listInset, paddingTop: 16, paddingBottom: 100 },
	columnWrapper: { marginBottom: 14, justifyContent: "space-between" },
	swatchWrapper: { width: "48%" },
	emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.listInset, paddingVertical: 60 },
	emptyTitle: { ...typography.body, color: colors.systemGray, marginTop: 16, marginBottom: 8 },
	emptySubtitle: { ...typography.footnote, color: colors.systemGray3, textAlign: "center", marginTop: 4 },
});
