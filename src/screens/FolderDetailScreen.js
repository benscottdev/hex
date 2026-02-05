import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import SwatchCard from '../components/SwatchCard';
import { getSwatchesForFolder, deleteSwatch } from '../services/storage';
import { getSimplifiedMixInstructions } from '../services/paintMixer';

export default function FolderDetailScreen({ route, navigation }) {
  const { folder } = route.params;
  const [swatches, setSwatches] = useState([]);
  const [selectedSwatch, setSelectedSwatch] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  const loadSwatches = async () => {
    const loadedSwatches = await getSwatchesForFolder(folder.id);
    setSwatches(loadedSwatches);
  };

  useFocusEffect(
    useCallback(() => {
      loadSwatches();
    }, [folder.id])
  );

  React.useLayoutEffect(() => {
    navigation.setOptions({
      title: folder.name,
      headerRight: () => (
        <TouchableOpacity
          style={styles.addColorButton}
          onPress={() => navigation.navigate('ColorPicker', { folder })}
        >
          <Text style={styles.addColorButtonText}>+ Add Color</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, folder]);

  const handleSwatchPress = (swatch) => {
    setSelectedSwatch(swatch);
    setDetailModalVisible(true);
  };

  const handleDeleteSwatch = async (swatchId) => {
    try {
      await deleteSwatch(swatchId);
      loadSwatches();
    } catch (error) {
      Alert.alert('Error', 'Failed to delete swatch');
    }
  };

  const renderSwatch = ({ item }) => (
    <SwatchCard
      swatch={item}
      onPress={() => handleSwatchPress(item)}
      onDelete={() => handleDeleteSwatch(item.id)}
    />
  );

  return (
    <View style={styles.container}>
      {swatches.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🎨</Text>
          <Text style={styles.emptyText}>No colors yet</Text>
          <Text style={styles.emptySubtext}>Tap "Add Color" to extract colors from an image</Text>
        </View>
      ) : (
        <FlatList
          data={swatches}
          renderItem={renderSwatch}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
        />
      )}

      {/* Detail Modal */}
      <Modal
        visible={detailModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedSwatch && (
              <ScrollView>
                <View
                  style={[
                    styles.largeColorPreview,
                    { backgroundColor: selectedSwatch.hex },
                  ]}
                />
                
                <Text style={styles.detailTitle}>Color Information</Text>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>HEX</Text>
                  <Text style={styles.detailValue}>{selectedSwatch.hex}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>RGB</Text>
                  <Text style={styles.detailValue}>
                    {selectedSwatch.rgb.r}, {selectedSwatch.rgb.g}, {selectedSwatch.rgb.b}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Sampling</Text>
                  <Text style={styles.detailValue}>{selectedSwatch.sampling}</Text>
                </View>
                
                <Text style={styles.mixTitle}>Paint Mix Formula</Text>
                
                {selectedSwatch.mix && selectedSwatch.mix.pigments && (
                  <>
                    <View style={styles.pigmentsList}>
                      {Object.entries(selectedSwatch.mix.pigments)
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
                    </View>
                    
                    <View style={styles.instructionsBox}>
                      <Text style={styles.instructionsTitle}>Mix Instructions</Text>
                      <Text style={styles.instructionsText}>
                        {getSimplifiedMixInstructions(selectedSwatch.mix)}
                      </Text>
                    </View>
                  </>
                )}
                
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setDetailModalVisible(false)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  addColorButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#007AFF',
    borderRadius: 6,
    marginRight: 10,
  },
  addColorButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    paddingVertical: 16,
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  largeColorPreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    color: '#000',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  detailValue: {
    fontSize: 15,
    color: '#000',
    fontWeight: '500',
  },
  mixTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 16,
    color: '#000',
  },
  pigmentsList: {
    marginBottom: 20,
  },
  pigmentRow: {
    marginBottom: 12,
  },
  pigmentBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
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
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    color: '#000',
  },
  instructionsText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
