import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, spacing } from "../theme/ios";
import { getColorName } from "../services/colorNameService";
import { updateSwatch } from "../services/storage";

export default function SwatchCard({ swatch, onPress, onDelete, inGrid = false, horizontal = false }) {
	const [fetchedName, setFetchedName] = useState(null);

	useEffect(() => {
		let cancelled = false;
		if (swatch?.name) {
			setFetchedName(null);
			return undefined;
		}
		(async () => {
			const name = await getColorName(swatch.hex);
			if (cancelled || !name) return;
			setFetchedName(name);
			if (swatch?.id) {
				try {
					await updateSwatch(swatch.id, { name });
				} catch {
					/* ignore persistence errors; subtitle still shows */
				}
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [swatch?.id, swatch?.hex, swatch?.name]);

	const colorName = swatch?.name ?? fetchedName;
	const handleLongPress = () => {
		Alert.alert("Delete Swatch", "Are you sure you want to delete this swatch?", [
			{ text: "Cancel", style: "cancel" },
			{ text: "Delete", style: "destructive", onPress: onDelete },
		]);
	};

	const formatDate = (ts) => new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
	const luminance = (hex) => {
		const r = parseInt(hex.slice(1, 3), 16) / 255;
		const g = parseInt(hex.slice(3, 5), 16) / 255;
		const b = parseInt(hex.slice(5, 7), 16) / 255;
		return 0.299 * r + 0.587 * g + 0.114 * b;
	};
	const isLight = luminance(swatch.hex) > 0.6;

	return (
		<TouchableOpacity style={[styles.card, inGrid && styles.cardGrid, horizontal && styles.cardHorizontal]} onPress={onPress} onLongPress={handleLongPress} activeOpacity={0.92}>
			<View style={[styles.swatchStripOuter, (inGrid || horizontal) && styles.swatchStripGrid, { backgroundColor: swatch.hex }]}>
				<View style={[styles.swatchStripInner, { borderColor: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.15)" }]} />
			</View>

			<View style={[styles.cardBody, (inGrid || horizontal) && styles.cardBodyGrid]}>
				<Text style={styles.hex} numberOfLines={1}>
					{swatch.hex}
				</Text>
				{colorName ? (
					<Text style={styles.colorNameSubtitle} numberOfLines={2}>
						{colorName}
					</Text>
				) : null}
				{/* <View style={styles.metaRow}>
					<Text style={styles.dateText}>{formatDate(swatch.createdAt)}</Text>
					<Ionicons name="chevron-forward" size={14} color={colors.systemGray4} />
				</View> */}
			</View>
		</TouchableOpacity>
	);
}

const SHADOW = Platform.select({
	ios: {
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.06,
		shadowRadius: 10,
	},
	android: { elevation: 3 },
});

const styles = StyleSheet.create({
	card: {
		backgroundColor: colors.white,
		borderRadius: 20,
		overflow: "hidden",
		marginHorizontal: spacing.listInset,
		marginBottom: 12,
		borderWidth: 1,
		borderColor: "rgba(58,58,60,0.06)",
		...SHADOW,
	},
	cardGrid: {
		marginHorizontal: 0,
	},
	cardHorizontal: {
		marginHorizontal: 0,
		marginBottom: 0,
	},
	swatchStripOuter: {
		height: 96,
		width: "100%",
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		position: "relative",
	},
	swatchStripGrid: {
		height: 100,
	},
	swatchStripInner: {
		...StyleSheet.absoluteFillObject,
		borderWidth: 1,
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
	},
	cardBody: {
		padding: 14,
	},
	cardBodyGrid: {
		padding: 12,
		paddingTop: 10,
	},
	hex: {
		...typography.title3,
		fontWeight: "600",
		color: colors.black,
		letterSpacing: 0.3,
	},
	colorNameSubtitle: {
		...typography.caption1,
		color: colors.systemGray2,
		marginTop: 4,
		lineHeight: 16,
	},
	metaRow: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	dateText: {
		...typography.caption2,
		color: colors.systemGray3,
	},
});
