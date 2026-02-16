import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage service using AsyncStorage
 * Manages folders and color swatches
 * Does NOT store images, only color data
 */

const STORAGE_KEYS = {
  FOLDERS: '@hex_folders',
  SWATCHES: '@hex_swatches',
};

/**
 * Get all folders
 * @returns {Promise<Array<{id: string, name: string, createdAt: number}>>}
 */
export async function getFolders() {
  try {
    const foldersJson = await AsyncStorage.getItem(STORAGE_KEYS.FOLDERS);
    return foldersJson ? JSON.parse(foldersJson) : [];
  } catch (error) {
    console.error('Error loading folders:', error);
    return [];
  }
}

/**
 * Create a new folder
 * @param {string} name - Folder name
 * @returns {Promise<{id: string, name: string, createdAt: number}>}
 */
export async function createFolder(name) {
  try {
    const folders = await getFolders();
    const newFolder = {
      id: Date.now().toString(),
      name,
      createdAt: Date.now(),
    };
    folders.push(newFolder);
    await AsyncStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
    return newFolder;
  } catch (error) {
    console.error('Error creating folder:', error);
    throw error;
  }
}

/**
 * Delete a folder and all its swatches
 * @param {string} folderId
 */
export async function deleteFolder(folderId) {
  try {
    const folders = await getFolders();
    const updatedFolders = folders.filter(f => f.id !== folderId);
    await AsyncStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(updatedFolders));
    
    // Delete all swatches in this folder
    const swatches = await getSwatches();
    const updatedSwatches = swatches.filter(s => s.folderId !== folderId);
    await AsyncStorage.setItem(STORAGE_KEYS.SWATCHES, JSON.stringify(updatedSwatches));
  } catch (error) {
    console.error('Error deleting folder:', error);
    throw error;
  }
}

/**
 * Rename a folder
 * @param {string} folderId
 * @param {string} newName
 */
export async function renameFolder(folderId, newName) {
  try {
    const folders = await getFolders();
    const folder = folders.find(f => f.id === folderId);
    if (folder) {
      folder.name = newName;
      await AsyncStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(folders));
    }
  } catch (error) {
    console.error('Error renaming folder:', error);
    throw error;
  }
}

/**
 * Get all swatches
 * @returns {Promise<Array>}
 */
export async function getSwatches() {
  try {
    const swatchesJson = await AsyncStorage.getItem(STORAGE_KEYS.SWATCHES);
    return swatchesJson ? JSON.parse(swatchesJson) : [];
  } catch (error) {
    console.error('Error loading swatches:', error);
    return [];
  }
}

/**
 * Get recent swatches (all, sorted by createdAt desc)
 * @param {number} [limit] - Optional limit (default: no limit)
 * @returns {Promise<Array>}
 */
export async function getRecentSwatches(limit) {
  try {
    const swatches = await getSwatches();
    swatches.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return limit ? swatches.slice(0, limit) : swatches;
  } catch (error) {
    console.error('Error loading recent swatches:', error);
    return [];
  }
}

/**
 * Get swatches for a specific folder
 * @param {string} folderId
 * @returns {Promise<Array>}
 */
export async function getSwatchesForFolder(folderId) {
  try {
    const swatches = await getSwatches();
    return swatches.filter(s => s.folderId === folderId);
  } catch (error) {
    console.error('Error loading swatches for folder:', error);
    return [];
  }
}

/**
 * Save a color swatch
 * @param {object} swatchData
 * @param {string} swatchData.folderId - Folder ID
 * @param {string} swatchData.folderName - Folder name
 * @param {string} swatchData.hex - Hex color code
 * @param {string} [swatchData.name] - Human-readable color name (from color-name-api)
 * @param {object} swatchData.rgb - RGB values {r, g, b}
 * @param {string} swatchData.sampling - Sampling method description
 * @param {object} swatchData.mix - Paint mix formula
 * @returns {Promise<object>} The saved swatch
 */
export async function saveSwatch(swatchData) {
  try {
    const swatches = await getSwatches();
    const newSwatch = {
      id: Date.now().toString(),
      folderId: swatchData.folderId ?? null,
      folderName: swatchData.folderName ?? null,
      hex: swatchData.hex,
      name: swatchData.name ?? null,
      rgb: swatchData.rgb,
      sampling: swatchData.sampling,
      mix: swatchData.mix,
      createdAt: Date.now(),
    };
    swatches.push(newSwatch);
    await AsyncStorage.setItem(STORAGE_KEYS.SWATCHES, JSON.stringify(swatches));
    return newSwatch;
  } catch (error) {
    console.error('Error saving swatch:', error);
    throw error;
  }
}

/**
 * Update an existing swatch
 * @param {string} swatchId
 * @param {object} updates - Partial swatch fields to merge (e.g. { mix })
 */
export async function updateSwatch(swatchId, updates) {
  try {
    const swatches = await getSwatches();
    const index = swatches.findIndex((s) => s.id === swatchId);
    if (index === -1) return null;
    swatches[index] = { ...swatches[index], ...updates };
    await AsyncStorage.setItem(STORAGE_KEYS.SWATCHES, JSON.stringify(swatches));
    return swatches[index];
  } catch (error) {
    console.error('Error updating swatch:', error);
    throw error;
  }
}

/**
 * Delete a swatch
 * @param {string} swatchId
 */
export async function deleteSwatch(swatchId) {
  try {
    const swatches = await getSwatches();
    const updatedSwatches = swatches.filter(s => s.id !== swatchId);
    await AsyncStorage.setItem(STORAGE_KEYS.SWATCHES, JSON.stringify(updatedSwatches));
  } catch (error) {
    console.error('Error deleting swatch:', error);
    throw error;
  }
}

/**
 * Clear all data (for testing/debugging)
 */
export async function clearAllData() {
  try {
    await AsyncStorage.multiRemove([STORAGE_KEYS.FOLDERS, STORAGE_KEYS.SWATCHES]);
  } catch (error) {
    console.error('Error clearing data:', error);
    throw error;
  }
}
