import React, { useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator, Dimensions, ScrollView, Modal, FlatList, TextInput, PanResponder } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../theme/ios";
import * as ImagePicker from "expo-image-picker";
import { extract8x8AverageColor, mapTapToImageCoordinates, EXPO_GO_UNSUPPORTED_MESSAGE } from "../services/colorExtractor";
import { generatePaintMix } from "../services/paintMixer";
import { saveSwatch, getFolders, createFolder } from "../services/storage";
import { getColorName } from "../services/colorNameService";

const screenWidth = Dimensions.get("window").width;
const GRID_SIZE = 16;
export default function ColorPickerScreen({ route, navigation }) {
	const insets = useSafeAreaInsets();
	const { folder, fromHome } = route.params || {};

	const [selectedImage, setSelectedImage] = useState(null);
	const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
	const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
	const [currentColor, setCurrentColor] = useState(null);
	const [loading, setLoading] = useState(false);
	const [tapPosition, setTapPosition] = useState(null);
	const [isDragging, setIsDragging] = useState(false);
	const displaySizeRef = useRef({ width: 0, height: 0 });
	const imageSizeRef = useRef({ width: 0, height: 0 });
	const selectedImageRef = useRef(null);
	const runExtractionRef = useRef(() => {});
	const imageWrapperRef = useRef(null);
	displaySizeRef.current = displaySize;
	imageSizeRef.current = imageSize;
	selectedImageRef.current = selectedImage;
	const [folderModalVisible, setFolderModalVisible] = useState(false);
	const [folders, setFolders] = useState([]);
	const [newFolderName, setNewFolderName] = useState("");
	const [showNewFolderInput, setShowNewFolderInput] = useState(false);
	// selectedDestination: 'recents' | { id, name } (folder)
	const [selectedDestination, setSelectedDestination] = useState("recents");
	const [dropdownExpanded, setDropdownExpanded] = useState(false);

	React.useLayoutEffect(() => {
		navigation.setOptions({
			title: fromHome ? "Extract Colors" : "Extract Color",
		});
	}, [navigation, fromHome]);

	const loadFolders = async () => {
		const loadedFolders = await getFolders();
		setFolders(loadedFolders);
	};

	useFocusEffect(
		useCallback(() => {
			loadFolders();
		}, []),
	);

	const showImagePickerOptions = () => {
		Alert.alert("Choose Image Source", "Select where you want to get the image from", [
			{
				text: "Camera",
				onPress: takePhoto,
			},
			{
				text: "Photo Library",
				onPress: pickImage,
			},
			{
				text: "Cancel",
				style: "cancel",
			},
		]);
	};

	const takePhoto = async () => {
		try {
			const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

			if (!permissionResult.granted) {
				Alert.alert("Permission Required", "Camera permission is required to take photos");
				return;
			}

			const result = await ImagePicker.launchCameraAsync({
				mediaTypes: ["images"],
				allowsEditing: false,
				quality: 1,
			});

			if (!result.canceled && result.assets && result.assets.length > 0) {
				const asset = result.assets[0];
				setSelectedImage(asset.uri);
				setImageSize({ width: asset.width, height: asset.height });
				setCurrentColor(null);
				setTapPosition(null);
			}
		} catch (error) {
			Alert.alert("Error", "Failed to take photo");
			console.error(error);
		}
	};

	const pickImage = async () => {
		try {
			const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

			if (!permissionResult.granted) {
				Alert.alert("Permission Required", "Camera roll permission is required to select images");
				return;
			}

			const result = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ["images"],
				allowsEditing: false,
				quality: 1,
			});

			if (!result.canceled && result.assets && result.assets.length > 0) {
				const asset = result.assets[0];
				setSelectedImage(asset.uri);
				setImageSize({ width: asset.width, height: asset.height });
				setCurrentColor(null);
				setTapPosition(null);
			}
		} catch (error) {
			Alert.alert("Error", "Failed to pick image");
			console.error(error);
		}
	};

	const runExtractionAtDisplayCoords = useCallback(
		async (locationX, locationY) => {
			if (!selectedImage || loading || !displaySize.width) return;
			setLoading(true);
			try {
				const imageCoords = mapTapToImageCoordinates(locationX, locationY, displaySize.width, displaySize.height, imageSize.width, imageSize.height);
				const colorData = await extract8x8AverageColor(selectedImage, imageCoords.x, imageCoords.y, imageSize.width, imageSize.height);
				const mix = generatePaintMix(colorData.rgb);
				const newColor = { ...colorData, mix, id: Date.now().toString() };
				setCurrentColor(newColor);
			} catch (error) {
				console.error("Color extraction error:", error);
				const message = error?.message === EXPO_GO_UNSUPPORTED_MESSAGE ? error.message : "Failed to extract color. Please try again.";
				Alert.alert("Error", message);
			} finally {
				setLoading(false);
			}
		},
		[selectedImage, loading, displaySize, imageSize],
	);
	runExtractionRef.current = runExtractionAtDisplayCoords;

	const panResponder = useRef(
		PanResponder.create({
			onStartShouldSetPanResponder: () => !loading,
			onStartShouldSetPanResponderCapture: () => !loading,
			onMoveShouldSetPanResponder: () => true,
			onMoveShouldSetPanResponderCapture: () => true,
			onPanResponderGrant: (evt) => {
				if (!selectedImage || loading) return;
				const { locationX, locationY } = evt.nativeEvent;
				setTapPosition({ x: locationX, y: locationY });
				setIsDragging(true);
			},
			onPanResponderMove: (evt) => {
				const { locationX, locationY } = evt.nativeEvent;
				setTapPosition({ x: locationX, y: locationY });
			},
			onPanResponderRelease: (evt) => {
				const { locationX, locationY } = evt.nativeEvent;
				setIsDragging(false);
				runExtractionRef.current(locationX, locationY);
			},
		}),
	).current;

	const handleSaveColor = async (colorToSave = currentColor) => {
		if (!colorToSave) return;

		if (fromHome) {
			setSelectedDestination("recents");
			setDropdownExpanded(false);
			setFolderModalVisible(true);
		} else if (folder) {
			await saveToFolder(folder, colorToSave);
		} else {
			await saveToRecents(colorToSave);
		}
	};

	const saveToRecents = async (color) => {
		try {
			setLoading(true);
			const name = await getColorName(color.hex);
			await saveSwatch({
				hex: color.hex,
				name,
				rgb: color.rgb,
				mix: color.mix,
				sampling: color.sampling || "16×16 pixel average",
			});

			Alert.alert("Saved!", "Color added to Your Recents", [
				{
					text: "OK",
					onPress: () => {
						if (fromHome) navigation.goBack();
					},
				},
			]);
		} catch (error) {
			Alert.alert("Error", "Failed to save color");
			console.error(error);
		} finally {
			setLoading(false);
			setFolderModalVisible(false);
		}
	};

	const saveToFolder = async (targetFolder, color) => {
		try {
			setLoading(true);
			const name = await getColorName(color.hex);
			await saveSwatch({
				folderId: targetFolder.id,
				folderName: targetFolder.name,
				hex: color.hex,
				name,
				rgb: color.rgb,
				mix: color.mix,
				sampling: color.sampling || "16×16 pixel average",
			});
			// Also add to recents so the color appears in Your Recents
			await saveSwatch({
				hex: color.hex,
				name,
				rgb: color.rgb,
				mix: color.mix,
				sampling: color.sampling || "16×16 pixel average",
			});

			Alert.alert("Saved!", `Color saved to ${targetFolder.name}`, [
				{
					text: "OK",
					onPress: () => {
						if (fromHome) navigation.goBack();
					},
				},
			]);
		} catch (error) {
			Alert.alert("Error", "Failed to save color swatch");
			console.error(error);
		} finally {
			setLoading(false);
			setFolderModalVisible(false);
		}
	};

	const handleCreateAndSaveFolder = async () => {
		if (!newFolderName.trim()) {
			Alert.alert("Error", "Please enter a folder name");
			return;
		}

		try {
			const newFolder = await createFolder(newFolderName.trim());
			setFolders((prev) => [...prev, newFolder]);
			setSelectedDestination(newFolder);
			setNewFolderName("");
			setShowNewFolderInput(false);
			setDropdownExpanded(false);
		} catch (error) {
			Alert.alert("Error", "Failed to create folder");
		}
	};

	const handleSaveToSelected = () => {
		if (selectedDestination === "recents") {
			saveToRecents(currentColor);
		} else {
			saveToFolder(selectedDestination, currentColor);
		}
	};

	const dropdownLabel = selectedDestination === "recents" ? "Your Recents" : (selectedDestination?.name ?? "Your Recents");

	const onImageLayout = (event) => {
		const { width, height } = event.nativeEvent.layout;
		setDisplaySize({ width, height });
	};

	return (
		<View style={styles.container}>
			{/* Image section OUTSIDE ScrollView so drag never hits scroll */}
			{!selectedImage ? (
				<ScrollView contentContainerStyle={styles.scrollContent}>
					<View style={styles.emptyState}>
						<View style={styles.emptyStateIcon}>
							<Ionicons name="camera" size={48} color={colors.systemGray3} />
						</View>
						<Text style={styles.emptyText}>Select an Image</Text>
						<Text style={styles.emptySubtext}>Choose from your library or take a photo to extract colors</Text>
						<TouchableOpacity style={styles.selectButton} onPress={showImagePickerOptions}>
							<Ionicons name="images-outline" size={22} color={colors.white} />
							<Text style={styles.selectButtonText}>Select Image</Text>
						</TouchableOpacity>
					</View>
				</ScrollView>
			) : (
				<>
					<View style={styles.imageSection}>
						<View style={styles.imageContainer}>
							<View
								ref={imageWrapperRef}
								style={[
									styles.imageWrapper,
									{
										width: displaySize.width || screenWidth,
										height: displaySize.height || screenWidth,
									},
								]}>
								<Image source={{ uri: selectedImage }} style={[styles.image, { width: displaySize.width || screenWidth, height: displaySize.height || screenWidth }]} resizeMode="contain" onLayout={onImageLayout} />
								<View style={styles.touchOverlay} {...panResponder.panHandlers} />
								{tapPosition && (
									<View
										style={[
											styles.crosshair,
											{
												left: tapPosition.x - 20,
												top: tapPosition.y - 20,
											},
										]}>
										{/* <View style={styles.crosshairRing} /> */}
										{/* <View style={styles.crosshairLineOuter} /> */}
										{/* <View style={[styles.crosshairLineOuter, styles.crosshairLineOuterH]} /> */}
										<View style={styles.crosshairLine} />
										<View style={[styles.crosshairLine, styles.crosshairLineH]} />
									</View>
								)}
							</View>

							{/* <Text style={styles.instruction}>Drag on the image to select a color</Text> */}
						</View>
					</View>

					<ScrollView contentContainerStyle={styles.scrollContent} style={styles.belowImageScroll} showsVerticalScrollIndicator={false}>
						{loading && (
							<View style={styles.loadingContainer}>
								<ActivityIndicator size="large" color={colors.darkGrey} />
								<Text style={styles.loadingText}>Sampling {GRID_SIZE * GRID_SIZE} pixels…</Text>
							</View>
						)}

						{currentColor && !loading && (
							<View style={styles.resultContainer}>
								<View style={[styles.colorPreview, { backgroundColor: currentColor.hex }]} />

								<View style={styles.colorInfo}>
									<Text style={styles.colorHex}>{currentColor.hex}</Text>
									<Text style={styles.colorRgb}>
										RGB({currentColor.rgb.r}, {currentColor.rgb.g}, {currentColor.rgb.b})
									</Text>
									<Text style={styles.colorSampling}>{currentColor.sampling}</Text>
								</View>

								{currentColor.mix && (
									<View style={styles.mixContainer}>
										<Text style={styles.mixTitle}>Paint Mix Formula</Text>
										{Object.entries(currentColor.mix.pigments)
											.sort(([, a], [, b]) => b.percentage - a.percentage)
											.map(([key, pigment]) => (
												<View key={key} style={styles.pigmentRow}>
													<View style={styles.pigmentBar}>
														<View style={[styles.pigmentBarFill, { width: `${pigment.percentage}%` }]} />
													</View>
													<Text style={styles.pigmentText}>
														{pigment.name}: {pigment.percentage}%
													</Text>
												</View>
											))}
									</View>
								)}

								<TouchableOpacity style={styles.saveButton} onPress={() => handleSaveColor()} disabled={loading}>
									<Text style={styles.saveButtonText}>{folder ? `Save to ${folder.name}` : "Save"}</Text>
								</TouchableOpacity>
							</View>
						)}

						<TouchableOpacity style={styles.changeImageButton} onPress={showImagePickerOptions}>
							<Text style={styles.changeImageButtonText}>Change Image</Text>
						</TouchableOpacity>
					</ScrollView>
				</>
			)}

			{/* Save / Folder Selection Modal */}
			<Modal visible={folderModalVisible} animationType="slide" transparent={true} onRequestClose={() => setFolderModalVisible(false)}>
				<View style={styles.sheetOverlay}>
					<TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={() => setFolderModalVisible(false)} />
					<View style={[styles.folderSheet, { paddingBottom: insets.bottom + 24 }]}>
						<Text style={styles.folderModalTitle}>Save Color</Text>

						<Text style={styles.folderSectionLabel}>Save to</Text>
						<TouchableOpacity style={styles.dropdownTrigger} onPress={() => setDropdownExpanded(!dropdownExpanded)} activeOpacity={0.7}>
							<Text style={styles.dropdownTriggerText} numberOfLines={1}>
								{dropdownLabel}
							</Text>
							<Ionicons name={dropdownExpanded ? "chevron-up" : "chevron-down"} size={20} color={colors.systemGray2} />
						</TouchableOpacity>

						{dropdownExpanded && (
							<ScrollView style={styles.dropdownList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
								<TouchableOpacity
									style={[styles.dropdownOption, selectedDestination === "recents" && styles.dropdownOptionSelected]}
									onPress={() => {
										setSelectedDestination("recents");
										setDropdownExpanded(false);
									}}>
									<Ionicons name="color-palette-outline" size={20} color={colors.systemGray2} />
									<Text style={styles.dropdownOptionText}>Your Recents</Text>
									{selectedDestination === "recents" && <Ionicons name="checkmark" size={20} color={colors.darkGrey} />}
								</TouchableOpacity>
								{folders.map((item) => (
									<TouchableOpacity
										key={item.id}
										style={[styles.dropdownOption, selectedDestination?.id === item.id && styles.dropdownOptionSelected]}
										onPress={() => {
											setSelectedDestination(item);
											setDropdownExpanded(false);
										}}>
										<Ionicons name="folder" size={20} color={colors.systemGray2} />
										<Text style={styles.dropdownOptionText} numberOfLines={1}>
											{item.name}
										</Text>
										{selectedDestination?.id === item.id && <Ionicons name="checkmark" size={20} color={colors.darkGrey} />}
									</TouchableOpacity>
								))}
								<TouchableOpacity
									style={styles.dropdownOptionCreate}
									onPress={() => {
										setDropdownExpanded(false);
										setShowNewFolderInput(true);
									}}>
									<Ionicons name="add-circle-outline" size={20} color={colors.darkGrey} />
									<Text style={styles.dropdownOptionCreateText}>Create New Folder</Text>
								</TouchableOpacity>
							</ScrollView>
						)}

						{showNewFolderInput && (
							<View style={styles.newFolderInputContainer}>
								<TextInput style={styles.folderInput} placeholder="Folder name" placeholderTextColor={colors.systemGray3} value={newFolderName} onChangeText={setNewFolderName} autoFocus={true} maxLength={30} autoCapitalize="words" />
								<View style={styles.newFolderButtons}>
									<TouchableOpacity
										style={[styles.folderModalButton, styles.cancelFolderButton]}
										onPress={() => {
											setShowNewFolderInput(false);
											setNewFolderName("");
										}}>
										<Text style={styles.cancelFolderButtonText}>Cancel</Text>
									</TouchableOpacity>
									<TouchableOpacity style={[styles.folderModalButton, styles.createFolderButton]} onPress={handleCreateAndSaveFolder}>
										<Text style={styles.createFolderButtonText}>Create</Text>
									</TouchableOpacity>
								</View>
							</View>
						)}

						<TouchableOpacity style={styles.saveToSwatchesButton} onPress={handleSaveToSelected}>
							<Ionicons name="checkmark-circle" size={20} color={colors.white} />
							<Text style={styles.saveToSwatchesButtonText}>Save to {dropdownLabel}</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={styles.sheetCancelButton}
							onPress={() => {
								setFolderModalVisible(false);
								setShowNewFolderInput(false);
								setNewFolderName("");
								setDropdownExpanded(false);
							}}>
							<Text style={styles.sheetCancelText}>Cancel</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.background },
	scrollContent: { flexGrow: 1, paddingBottom: 100 },
	emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.listInset, paddingVertical: 60 },
	emptyStateIcon: {
		width: 88,
		height: 88,
		borderRadius: 44,
		backgroundColor: colors.backgroundMuted,
		alignItems: "center",
		justifyContent: "center",
		marginBottom: 20,
	},
	emptyText: { ...typography.body, fontWeight: "400", color: colors.systemGray, marginBottom: 8 },
	emptySubtext: { ...typography.footnote, color: colors.systemGray3, textAlign: "center", marginTop: 4, marginBottom: 24, paddingHorizontal: 20 },
	selectButton: {
		flexDirection: "row",
		alignItems: "center",
		gap: 10,
		backgroundColor: colors.ctaOrange,
		paddingHorizontal: 28,
		paddingVertical: 16,
		borderRadius: 10,
	},
	selectButtonText: { ...typography.body, fontWeight: "600", fontSize: 18, color: colors.white },
	imageSection: { flexShrink: 0, overflow: "visible" },
	belowImageScroll: { flex: 1 },
	imageContainer: { alignItems: "center", paddingHorizontal: 20, paddingVertical: 0, marginHorizontal: 0, overflow: "visible" },
	image: { width: screenWidth, height: screenWidth },
	crosshair: {
		position: "absolute",
		width: 40,
		height: 40,
		alignItems: "center",
		justifyContent: "center",
	},
	crosshairRing: {
		position: "absolute",
		width: 40,
		height: 40,
		borderRadius: 20,
		borderWidth: 2.5,
		borderColor: "rgba(255,255,255,0.95)",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.5,
		shadowRadius: 2,
		elevation: 4,
	},
	crosshairLineOuter: {
		position: "absolute",
		width: 4,
		height: 36,
		backgroundColor: "rgba(255,255,255,0.9)",
	},
	crosshairLineOuterH: { width: 36, height: 4 },
	crosshairLine: {
		position: "absolute",
		width: 4,
		height: 28,
		backgroundColor: colors.white,
		mixBlendMode: "difference",
	},
	crosshairLineH: { width: 28, height: 4 },
	instruction: { marginTop: 12, ...typography.footnote, color: colors.systemGray, textAlign: "center" },
	loadingContainer: { alignItems: "center", padding: 20 },
	loadingText: { marginTop: 12, ...typography.footnote, color: colors.systemGray },
	resultContainer: { paddingHorizontal: spacing.listInset, paddingVertical: 20 },
	colorPreview: { width: "100%", height: 120, borderRadius: 20, marginBottom: 16 },
	colorInfo: { marginBottom: 20 },
	colorHex: { ...typography.title2, color: colors.black, marginBottom: 4 },
	colorRgb: { ...typography.subheadline, color: colors.systemGray, marginBottom: 4 },
	colorSampling: { ...typography.caption1, color: colors.systemGray2 },
	mixContainer: { backgroundColor: colors.white, padding: 16, borderRadius: 24, marginBottom: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
	mixTitle: { ...typography.footnote, fontWeight: "600", color: colors.systemGray, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
	pigmentRow: { marginBottom: 12 },
	pigmentBar: { height: 6, backgroundColor: colors.warmGray, borderRadius: 3, marginBottom: 6, overflow: "hidden" },
	pigmentBarFill: { height: "100%", backgroundColor: colors.darkGrey, borderRadius: 3 },
	pigmentText: { ...typography.subheadline, color: colors.black },
	saveButton: { backgroundColor: colors.darkGrey, paddingVertical: 16, borderRadius: 20, alignItems: "center", marginBottom: 10 },
	saveButtonText: { ...typography.body, fontWeight: "600", color: colors.white },
	changeImageButton: { marginHorizontal: spacing.screenPadding, marginBottom: 20, paddingVertical: 14, borderRadius: 20, alignItems: "center", backgroundColor: colors.yellow },
	changeImageButtonText: { ...typography.body, fontWeight: "600", color: colors.darkGrey },
	imageWrapper: { position: "relative", overflow: "visible" },
	touchOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "transparent" },
	sheetOverlay: { flex: 1, justifyContent: "flex-end" },
	sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
	folderSheet: { backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.sectionPadding, maxHeight: "70%" },
	folderModalTitle: { ...typography.title3, color: colors.black, marginBottom: 16 },
	folderSectionLabel: { ...typography.footnote, color: colors.systemGray, marginBottom: 8 },
	dropdownTrigger: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "space-between",
		backgroundColor: colors.cream,
		paddingVertical: 14,
		paddingHorizontal: 16,
		borderRadius: 16,
		marginBottom: 12,
	},
	dropdownTriggerText: { ...typography.body, color: colors.black, flex: 1, marginRight: 8 },
	dropdownList: { marginBottom: 16, maxHeight: 240 },
	dropdownOption: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		marginBottom: 4,
		backgroundColor: colors.cream,
	},
	dropdownOptionSelected: { backgroundColor: "rgba(58,58,60,0.08)" },
	dropdownOptionText: { ...typography.body, color: colors.black, flex: 1, marginLeft: 12 },
	dropdownOptionCreate: {
		flexDirection: "row",
		alignItems: "center",
		paddingVertical: 12,
		paddingHorizontal: 16,
		borderRadius: 12,
		marginTop: 4,
		gap: 8,
	},
	dropdownOptionCreateText: { ...typography.body, fontWeight: "600", color: colors.darkGrey },
	saveToSwatchesButton: {
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		gap: 12,
		backgroundColor: colors.ctaOrange,
		height: 50,
		borderRadius: 10,
		marginBottom: 12,
	},
	saveToSwatchesButtonText: { ...typography.body, fontWeight: "600", fontSize: 18, color: colors.white },
	newFolderInputContainer: { marginBottom: 16 },
	folderInput: { ...typography.body, backgroundColor: colors.cream, borderRadius: 16, padding: 12, marginBottom: 12 },
	newFolderButtons: { flexDirection: "row", gap: 12 },
	folderModalButton: { flex: 1, paddingVertical: 12, borderRadius: 20, alignItems: "center" },
	cancelFolderButton: { backgroundColor: colors.yellow },
	createFolderButton: { backgroundColor: colors.ctaOrange },
	cancelFolderButtonText: { ...typography.body, fontWeight: "600", color: colors.darkGrey },
	createFolderButtonText: { ...typography.body, fontWeight: "600", color: colors.white },
	sheetCancelButton: { paddingVertical: 14, alignItems: "center" },
	sheetCancelText: { ...typography.body, fontWeight: "600", color: colors.darkGrey },
});
