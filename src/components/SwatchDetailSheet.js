import React, { useState, useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Dimensions } from "react-native";
import Slider from "@react-native-community/slider";
import { colors, typography, spacing } from "../theme/ios";
import { getHowToMixGuide, getMatchPercent, simulateMix, getPigmentHex } from "../services/paintMixer";
import { updateSwatch } from "../services/storage";

export default function SwatchDetailSheet({ swatch, onClose, onSaved, showFolder = false, showHandle = true }) {
	const [editMode, setEditMode] = useState(false);
	const [editingPigments, setEditingPigments] = useState(null);
	const [howToMixExpanded, setHowToMixExpanded] = useState(false);

	const matchPercent = useMemo(() => {
		if (!swatch?.mix) return 0;
		return getMatchPercent(swatch.rgb, swatch.mix);
	}, [swatch?.rgb, swatch?.mix]);

	const pigmentsList = swatch?.mix?.pigments
		? Object.entries(swatch.mix.pigments)
				.filter(([, p]) => p && p.percentage > 0)
				.sort(([, a], [, b]) => b.percentage - a.percentage)
		: [];

	const initEditState = () => {
		const state = {};
		pigmentsList.forEach(([key, p]) => {
			state[key] = { ...p };
		});
		setEditingPigments(state);
	};

	const handleRefine = () => {
		initEditState();
		setEditMode(true);
	};

	const handlePigmentChange = (key, newPercentage) => {
		if (!editingPigments) return;
		const others = Object.keys(editingPigments).filter((k) => k !== key);
		const remaining = 100 - newPercentage;
		const othersSum = others.reduce((s, k) => s + editingPigments[k].percentage, 0);

		const next = { ...editingPigments };
		next[key] = { ...next[key], percentage: Math.round(newPercentage) };

		if (othersSum > 0 && remaining >= 0) {
			others.forEach((k) => {
				const pct = (editingPigments[k].percentage / othersSum) * remaining;
				next[k] = { ...next[k], percentage: Math.round(pct) };
			});
			const diff = 100 - Object.values(next).reduce((s, p) => s + p.percentage, 0);
			if (diff !== 0 && next[key]) {
				next[key].percentage = Math.max(0, next[key].percentage + diff);
			}
		}

		setEditingPigments(next);
	};

	const getEditMatchPercent = () => {
		if (!editingPigments || !swatch?.rgb) return 0;
		const weights = {};
		Object.entries(editingPigments).forEach(([k, p]) => {
			if (p.percentage > 0) weights[k] = p.percentage;
		});
		return getMatchPercent(swatch.rgb, { pigments: Object.fromEntries(Object.entries(editingPigments).map(([k, p]) => [k, { ...p }])) });
	};

	const getSimulatedHex = () => {
		if (!editingPigments || !swatch?.rgb) return swatch?.hex;
		const weights = {};
		Object.entries(editingPigments).forEach(([k, p]) => {
			if (p.percentage > 0) weights[k] = p.percentage;
		});
		const rgb = simulateMix(weights);
		const toHex = (n) =>
			Math.max(0, Math.min(255, Math.round(n)))
				.toString(16)
				.padStart(2, "0");
		return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`.toUpperCase();
	};

	const handleSave = async () => {
		if (!editingPigments || !swatch) return;
		const pigments = {};
		Object.entries(editingPigments).forEach(([k, p]) => {
			pigments[k] = { name: p.name, percentage: p.percentage, parts: p.percentage };
		});
		const mix = {
			pigments,
			totalParts: 100,
			description: Object.values(pigments)
				.sort((a, b) => b.percentage - a.percentage)
				.map((p) => `${p.percentage}% ${p.name}`)
				.join(" + "),
			lightness: swatch.mix?.lightness,
		};
		try {
			await updateSwatch(swatch.id, { mix });
			onSaved?.();
			setEditMode(false);
			setEditingPigments(null);
		} catch (err) {
			Alert.alert("Error", "Failed to save changes");
		}
	};

	const handleCancelEdit = () => {
		setEditMode(false);
		setEditingPigments(null);
	};

	const displayPigments = editMode && editingPigments ? Object.entries(editingPigments).sort(([, a], [, b]) => (b?.percentage ?? 0) - (a?.percentage ?? 0)) : pigmentsList;
	const editMatchPercent = editMode ? getEditMatchPercent() : null;
	const editPreviewHex = editMode ? getSimulatedHex() : null;
	const currentHex = editPreviewHex || swatch?.hex;

	const luminance = (hex) => {
		const r = parseInt(hex.slice(1, 3), 16) / 255;
		const g = parseInt(hex.slice(3, 5), 16) / 255;
		const b = parseInt(hex.slice(5, 7), 16) / 255;
		return 0.299 * r + 0.587 * g + 0.114 * b;
	};
	const isLight = luminance(currentHex) > 0.6;

	const fullHeight = Dimensions.get("window").height - 120;

	return (
		<ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={[showHandle ? undefined : styles.fullPageContent, { minHeight: fullHeight, paddingBottom: 24 }]}>
			{showHandle && <View style={styles.sheetHandle} />}

			{/* Color block: component strips + main swatch with hex overlay + percentages below */}
			<View style={styles.colorBlock}>
				{displayPigments.length > 0 && (
					<View style={styles.componentStrips}>
						{displayPigments.map(([key, pigment]) => (
							<View
								key={key}
								style={[
									styles.componentStrip,
									{
										backgroundColor: getPigmentHex(key),
										flex: pigment.percentage || 0,
									},
								]}>
								<Text style={[styles.stripPercent, { color: luminance(getPigmentHex(key)) > 0.5 ? colors.darkGrey : colors.white }]}>{pigment.percentage}%</Text>
							</View>
						))}
					</View>
				)}
				<View style={[styles.mainSwatch, { backgroundColor: currentHex }]}>
					<Text style={[styles.hexOverlay, { color: isLight ? colors.darkGrey : colors.white }]}>{swatch?.name || currentHex}</Text>
					{swatch?.name && <Text style={[styles.hexSubline, { color: isLight ? "rgba(58,58,60,0.7)" : "rgba(255,255,255,0.85)" }]}>{currentHex}</Text>}
				</View>
				{displayPigments.length > 0 && (
					<View style={styles.mixInstructions}>
						{/* <Text style={styles.mixInstructionsTitle}>Mix in this ratio:</Text> */}
						{displayPigments.map(([key, pigment], index) => (
							<View key={key} style={styles.mixInstructionsStep}>
								<View style={[styles.mixColorSample, { backgroundColor: getPigmentHex(key) }]} />
								<Text style={styles.mixInstructionsText}>
									Mix in {pigment.percentage}% {pigment.name}
								</Text>
							</View>
						))}
					</View>
				)}
			</View>

			{/* Color info section with pill titles */}
			<View style={styles.section}>
				{showFolder && (
					<View style={styles.infoRow}>
						<Text style={styles.infoLabel}>Folder</Text>
						<Text style={styles.infoValue}>{swatch?.folderName}</Text>
					</View>
				)}
			</View>

			{/* Match section */}
			{pigmentsList.length > 0 && (
				<View style={styles.section}>
					<View style={styles.pillTitle}>
						<Text style={styles.pillTitleText}>Match {editMatchPercent ?? matchPercent}%</Text>
					</View>

					{!editMode ? (
						<>
							<View style={styles.instructionsBox}>
								<TouchableOpacity style={styles.instructionsHeader} onPress={() => setHowToMixExpanded(!howToMixExpanded)} activeOpacity={0.7}>
									<Text style={styles.instructionsTitle}>How to Mix</Text>
									<Text style={styles.chevron}>{howToMixExpanded ? "−" : "+"}</Text>
								</TouchableOpacity>
								{howToMixExpanded ? <Text style={styles.instructionsText}>{getHowToMixGuide(swatch.mix)}</Text> : <Text style={styles.instructionsPreview}>Step-by-step guide</Text>}
							</View>
							<TouchableOpacity style={styles.refineButton} onPress={handleRefine}>
								<Text style={styles.refineButtonText}>Refine Mix</Text>
							</TouchableOpacity>
						</>
					) : (
						<>
							<View style={styles.pigmentsEditList}>
								{Object.entries(editingPigments || {}).map(([key, pigment]) => (
									<View key={key} style={styles.pigmentEditRow}>
										<Text style={styles.pigmentLabel}>{pigment.name}</Text>
										<View style={styles.sliderRow}>
											<Slider style={styles.slider} minimumValue={0} maximumValue={100} step={1} value={pigment.percentage} onValueChange={(v) => handlePigmentChange(key, v)} minimumTrackTintColor={colors.darkGrey} maximumTrackTintColor={colors.warmGray} thumbTintColor={colors.darkGrey} />
											<Text style={styles.pigmentPct}>{pigment.percentage}%</Text>
										</View>
									</View>
								))}
							</View>
							<View style={styles.editActions}>
								<TouchableOpacity style={styles.cancelEditButton} onPress={handleCancelEdit}>
									<Text style={styles.cancelEditText}>Cancel</Text>
								</TouchableOpacity>
								<TouchableOpacity style={styles.saveEditButton} onPress={handleSave}>
									<Text style={styles.saveEditText}>Save</Text>
								</TouchableOpacity>
							</View>
						</>
					)}
				</View>
			)}

			<TouchableOpacity style={styles.doneButton} onPress={onClose}>
				<Text style={styles.doneButtonText}>Done</Text>
			</TouchableOpacity>
		</ScrollView>
	);
}

const styles = StyleSheet.create({
	scrollView: { flex: 1 },
	fullPageContent: { paddingTop: 0, flexGrow: 1 },
	sheetHandle: {
		width: 36,
		height: 4,
		borderRadius: 2,
		backgroundColor: colors.systemGray4,
		alignSelf: "center",
		marginBottom: 20,
	},

	componentStrips: {
		flexDirection: "row",
		height: 56,
		borderTopLeftRadius: 16,
		borderTopRightRadius: 16,
		overflow: "hidden",
		marginBottom: 4,
	},
	componentStrip: {
		minWidth: 4,
		justifyContent: "center",
		alignItems: "center",
	},
	mainSwatch: {
		width: "100%",
		marginTop: -10,
		height: 160,
		borderBottomLeftRadius: 20,
		borderBottomRightRadius: 20,
		justifyContent: "center",
		alignItems: "center",
		position: "relative",
		...(Platform.OS === "ios"
			? {
					shadowColor: "#000",
					shadowOffset: { width: 0, height: -4 },
					shadowOpacity: 0.1,
					shadowRadius: 5,
				}
			: { elevation: 8 }),
	},
	stripPercent: {
		...typography.caption1,
		fontWeight: "700",
		textShadowColor: "rgba(0,0,0,0.3)",
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 2,
	},
	hexOverlay: {
		...typography.body,
		fontWeight: "700",
		letterSpacing: 1,
		textShadowColor: "rgba(0,0,0,0.2)",
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 4,
	},
	hexSubline: {
		...typography.caption1,
		letterSpacing: 0.5,
		marginTop: 4,
		textShadowColor: "rgba(0,0,0,0.2)",
		textShadowOffset: { width: 0, height: 1 },
		textShadowRadius: 2,
	},
	mixInstructions: {
		marginTop: 16,
		backgroundColor: colors.cream,
		padding: 16,
		borderRadius: 16,
	},
	mixInstructionsTitle: {
		...typography.subheadline,
		fontWeight: "600",
		color: colors.darkGrey,
		marginBottom: 10,
	},
	mixInstructionsStep: {
		flexDirection: "row",
		alignItems: "center",
		marginBottom: 10,
		gap: 12,
	},
	mixColorSample: {
		width: 28,
		height: 28,
		borderRadius: 8,
	},
	mixInstructionsText: {
		...typography.body,
		color: colors.darkGrey,
		flex: 1,
	},
	section: {
		marginBottom: 24,
	},
	pillTitle: {
		alignSelf: "flex-start",
		backgroundColor: colors.yellow,
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 20,
		marginBottom: 12,
	},
	pillTitleText: {
		...typography.subheadline,
		fontWeight: "600",
		color: colors.darkGrey,
	},
	infoRow: {
		flexDirection: "row",
		justifyContent: "space-between",
		paddingVertical: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: "rgba(58,58,60,0.08)",
	},
	infoLabel: { ...typography.body, color: colors.systemGray },
	infoValue: { ...typography.body, fontWeight: "500", color: colors.black },
	instructionsBox: {
		backgroundColor: colors.cream,
		padding: 16,
		borderRadius: 16,
		marginBottom: 12,
	},
	instructionsHeader: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
	},
	instructionsTitle: { ...typography.footnote, fontWeight: "600", color: colors.darkGrey },
	chevron: { ...typography.body, fontWeight: "600", color: colors.systemGray },
	instructionsText: { ...typography.subheadline, color: colors.black, lineHeight: 22 },
	instructionsPreview: { ...typography.caption1, color: colors.systemGray },
	refineButton: {
		paddingVertical: 12,
		alignItems: "center",
		backgroundColor: colors.yellow,
		borderRadius: 20,
		marginBottom: 4,
	},
	refineButtonText: { ...typography.body, fontWeight: "600", color: colors.darkGrey },
	pigmentsEditList: { marginBottom: 16 },
	pigmentEditRow: { marginBottom: 14 },
	pigmentLabel: { ...typography.subheadline, color: colors.black, marginBottom: 4 },
	sliderRow: { flexDirection: "row", alignItems: "center" },
	slider: { flex: 1, height: 40 },
	pigmentPct: { ...typography.subheadline, fontWeight: "600", color: colors.black, width: 44, textAlign: "right" },
	editActions: { flexDirection: "row", gap: 12, marginBottom: 8 },
	cancelEditButton: {
		flex: 1,
		paddingVertical: 14,
		alignItems: "center",
		backgroundColor: colors.yellow,
		borderRadius: 20,
	},
	cancelEditText: { ...typography.body, fontWeight: "600", color: colors.black },
	saveEditButton: {
		flex: 1,
		paddingVertical: 14,
		alignItems: "center",
		backgroundColor: colors.darkGrey,
		borderRadius: 20,
	},
	saveEditText: { ...typography.body, fontWeight: "600", color: colors.white },
	doneButton: {
		backgroundColor: colors.darkGrey,
		paddingVertical: 14,
		borderRadius: 20,
		alignItems: "center",
	},
	doneButtonText: { ...typography.body, fontWeight: "600", color: colors.white },
});
