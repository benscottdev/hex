import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {
  extract8x8AverageColor,
  mapTapToImageCoordinates,
} from '../services/colorExtractor';
import { generatePaintMix, getSimplifiedMixInstructions } from '../services/paintMixer';
import { saveSwatch } from '../services/storage';

const screenWidth = Dimensions.get('window').width;

export default function ColorPickerScreen({ route, navigation }) {
  const { folder } = route.params;
  
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [extractedColor, setExtractedColor] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tapPosition, setTapPosition] = useState(null);

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Extract Color',
    });
  }, [navigation]);

  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Camera roll permission is required to select images');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedImage(asset.uri);
        setImageSize({ width: asset.width, height: asset.height });
        setExtractedColor(null);
        setTapPosition(null);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
      console.error(error);
    }
  };

  const handleImagePress = async (event) => {
    if (!selectedImage || loading) return;

    const { locationX, locationY } = event.nativeEvent;
    setLoading(true);
    setTapPosition({ x: locationX, y: locationY });

    try {
      // Map tap coordinates to original image coordinates
      const imageCoords = mapTapToImageCoordinates(
        locationX,
        locationY,
        displaySize.width,
        displaySize.height,
        imageSize.width,
        imageSize.height
      );

      // Extract color with 8×8 averaging
      const colorData = await extract8x8AverageColor(
        selectedImage,
        imageCoords.x,
        imageCoords.y,
        imageSize.width,
        imageSize.height
      );

      // Generate paint mix
      const mix = generatePaintMix(colorData.rgb);

      setExtractedColor({
        ...colorData,
        mix,
      });
    } catch (error) {
      console.error('Color extraction error:', error);
      Alert.alert('Error', 'Failed to extract color. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveColor = async () => {
    if (!extractedColor) return;

    try {
      setLoading(true);
      await saveSwatch({
        folderId: folder.id,
        folderName: folder.name,
        hex: extractedColor.hex,
        rgb: extractedColor.rgb,
        sampling: extractedColor.sampling,
        mix: extractedColor.mix,
      });

      Alert.alert(
        'Saved!',
        'Color swatch saved successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save color swatch');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onImageLayout = (event) => {
    const { width, height } = event.nativeEvent.layout;
    setDisplaySize({ width, height });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!selectedImage ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🖼️</Text>
            <Text style={styles.emptyText}>Select an Image</Text>
            <Text style={styles.emptySubtext}>
              Choose an image from your library to extract colors
            </Text>
            <TouchableOpacity style={styles.selectButton} onPress={pickImage}>
              <Text style={styles.selectButtonText}>Select Image</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.imageContainer}>
              <TouchableOpacity
                activeOpacity={1}
                onPress={handleImagePress}
                disabled={loading}
              >
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.image}
                  resizeMode="contain"
                  onLayout={onImageLayout}
                />
                {tapPosition && (
                  <View
                    style={[
                      styles.tapIndicator,
                      {
                        left: tapPosition.x - 10,
                        top: tapPosition.y - 10,
                      },
                    ]}
                  />
                )}
              </TouchableOpacity>
              
              <Text style={styles.instruction}>
                Tap anywhere on the image to extract color
              </Text>
            </View>

            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Sampling 64 pixels...</Text>
              </View>
            )}

            {extractedColor && !loading && (
              <View style={styles.resultContainer}>
                <View
                  style={[
                    styles.colorPreview,
                    { backgroundColor: extractedColor.hex },
                  ]}
                />
                
                <View style={styles.colorInfo}>
                  <Text style={styles.colorHex}>{extractedColor.hex}</Text>
                  <Text style={styles.colorRgb}>
                    RGB({extractedColor.rgb.r}, {extractedColor.rgb.g}, {extractedColor.rgb.b})
                  </Text>
                  <Text style={styles.colorSampling}>{extractedColor.sampling}</Text>
                </View>

                {extractedColor.mix && (
                  <View style={styles.mixContainer}>
                    <Text style={styles.mixTitle}>Paint Mix Formula</Text>
                    
                    {Object.entries(extractedColor.mix.pigments)
                      .sort(([, a], [, b]) => b.percentage - a.percentage)
                      .map(([key, pigment]) => (
                        <View key={key} style={styles.pigmentRow}>
                          <View style={styles.pigmentBar}>
                            <View
                              style={[
                                styles.pigmentBarFill,
                                { width: `${pigment.percentage}%` },
                              ]}
                            />
                          </View>
                          <Text style={styles.pigmentText}>
                            {pigment.name}: {pigment.percentage}%
                          </Text>
                        </View>
                      ))}
                    
                    <View style={styles.instructionsBox}>
                      <Text style={styles.instructionsText}>
                        {getSimplifiedMixInstructions(extractedColor.mix)}
                      </Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveColor}
                  disabled={loading}
                >
                  <Text style={styles.saveButtonText}>Save to {folder.name}</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={styles.changeImageButton}
              onPress={pickImage}
            >
              <Text style={styles.changeImageButtonText}>Change Image</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 24,
  },
  selectButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 8,
  },
  selectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imageContainer: {
    alignItems: 'center',
    padding: 16,
  },
  image: {
    width: screenWidth - 32,
    height: screenWidth - 32,
  },
  tapIndicator: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#007AFF',
    backgroundColor: 'rgba(0, 122, 255, 0.2)',
  },
  instruction: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  resultContainer: {
    padding: 20,
  },
  colorPreview: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  colorInfo: {
    marginBottom: 20,
  },
  colorHex: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  colorRgb: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  colorSampling: {
    fontSize: 12,
    color: '#999',
  },
  mixContainer: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  mixTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#000',
  },
  pigmentRow: {
    marginBottom: 12,
  },
  pigmentBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 6,
    overflow: 'hidden',
  },
  pigmentBarFill: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 4,
  },
  pigmentText: {
    fontSize: 14,
    color: '#333',
  },
  instructionsBox: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: '#34C759',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  changeImageButton: {
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  changeImageButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
