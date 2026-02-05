import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';

/**
 * SwatchCard component - displays a color swatch with details
 */
export default function SwatchCard({ swatch, onPress, onDelete }) {
  const handleLongPress = () => {
    Alert.alert(
      'Delete Swatch',
      'Are you sure you want to delete this swatch?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onDelete },
      ]
    );
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getPrimaryPigments = () => {
    if (!swatch.mix || !swatch.mix.pigments) return '';
    
    const pigments = Object.entries(swatch.mix.pigments)
      .sort(([, a], [, b]) => b.percentage - a.percentage)
      .slice(0, 2)
      .map(([, p]) => `${p.percentage}% ${p.name}`)
      .join(' + ');
    
    return pigments;
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      onLongPress={handleLongPress}
      activeOpacity={0.7}
    >
      <View style={[styles.colorPreview, { backgroundColor: swatch.hex }]} />
      <View style={styles.details}>
        <Text style={styles.hex}>{swatch.hex}</Text>
        <Text style={styles.rgb}>
          RGB({swatch.rgb.r}, {swatch.rgb.g}, {swatch.rgb.b})
        </Text>
        <Text style={styles.mix} numberOfLines={1}>
          {getPrimaryPigments()}
        </Text>
        <Text style={styles.date}>{formatDate(swatch.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  colorPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  details: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'space-between',
  },
  hex: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  rgb: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  mix: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  date: {
    fontSize: 11,
    color: '#aaa',
    marginTop: 4,
  },
});
