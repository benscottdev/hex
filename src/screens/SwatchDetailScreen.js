import React from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SwatchDetailSheet from "../components/SwatchDetailSheet";
import { colors, spacing } from "../theme/ios";

export default function SwatchDetailScreen({ route, navigation }) {
	const insets = useSafeAreaInsets();
	const { swatch, showFolder = false } = route.params || {};

	if (!swatch) {
		return null;
	}

	const handleClose = () => {
		navigation.goBack();
	};

	const handleSaved = () => {
		navigation.goBack();
	};

	return (
		<View style={[styles.container, { paddingBottom: insets.bottom + 24 }]}>
			<SwatchDetailSheet
				swatch={swatch}
				onClose={handleClose}
				onSaved={handleSaved}
				showFolder={showFolder}
				showHandle={false}
			/>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.background,
		paddingHorizontal: spacing.listInset,
	},
});
