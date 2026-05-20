import { Platform, NativeModules } from 'react-native';
import { init, pickColorAt } from '@thebeka/react-native-get-pixel-color';

const pixelColorModule = Platform.OS === 'ios' ? NativeModules.RNPixelColor : NativeModules.GetPixelColor;
const NATIVE_MODULE_MISSING = !pixelColorModule;

/**
 * Color extraction service using @thebeka/react-native-get-pixel-color
 * Implements 16×16 averaging with proper sRGB ↔ linear RGB conversion
 * Requires a development build (expo run:ios) — does not work in Expo Go.
 */

/**
 * Convert sRGB value (0-255) to linear RGB (0-1)
 * Formula: https://en.wikipedia.org/wiki/SRGB#From_sRGB_to_CIE_XYZ
 */
function srgbToLinear(srgb) {
  const normalized = srgb / 255;
  if (normalized <= 0.04045) {
    return normalized / 12.92;
  }
  return Math.pow((normalized + 0.055) / 1.055, 2.4);
}

/**
 * Convert linear RGB (0-1) to sRGB value (0-255)
 */
function linearToSrgb(linear) {
  if (linear <= 0.0031308) {
    return Math.round(linear * 12.92 * 255);
  }
  return Math.round((1.055 * Math.pow(linear, 1 / 2.4) - 0.055) * 255);
}

/**
 * Convert RGB to HEX with no rounding drift
 */
function rgbToHex(r, g, b) {
  const toHex = (value) => {
    const hex = Math.max(0, Math.min(255, Math.round(value))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Convert HEX color to RGB
 * @param {string} hex - Hex color like "#RRGGBB"
 * @returns {{r: number, g: number, b: number}}
 */
function hexToRgb(hex) {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  
  return { r, g, b };
}

/**
 * Extract color from a single pixel
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {Promise<{r: number, g: number, b: number} | null>}
 */
async function getSinglePixelColor(x, y) {
  try {
    // pickColorAt returns a HEX string like "#RRGGBB"
    const hexColor = await pickColorAt(x, y);
    return hexToRgb(hexColor);
  } catch (error) {
    console.warn(`Failed to get pixel at (${x}, ${y}):`, error.message);
    return null;
  }
}

/**
 * Get color at a single pixel (for live drag preview).
 * @param {string} imageUri - URI of the image
 * @param {number} imageX - X in image coordinates
 * @param {number} imageY - Y in image coordinates
 * @param {number} imageWidth - Original image width (for clamping)
 * @param {number} imageHeight - Original image height (for clamping)
 * @returns {Promise<{hex: string, rgb: {r: number, g: number, b: number}} | null>}
 */
export async function getPixelColorAtImageCoords(imageUri, imageX, imageY, imageWidth, imageHeight) {
  if (NATIVE_MODULE_MISSING) return null;
  const x = Math.max(0, Math.min(imageWidth - 1, Math.round(imageX)));
  const y = Math.max(0, Math.min(imageHeight - 1, Math.round(imageY)));
  try {
    await init(imageUri);
    const rgb = await getSinglePixelColor(x, y);
    if (!rgb) return null;
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    return { hex, rgb };
  } catch {
    return null;
  }
}

/**
 * Extract color from a pixel grid around a tap point
 * Performs proper linear RGB averaging
 * 
 * @param {string} imageUri - URI of the image
 * @param {number} centerX - Center X coordinate
 * @param {number} centerY - Center Y coordinate
 * @param {number} imageWidth - Original image width
 * @param {number} imageHeight - Original image height
 * @returns {Promise<{hex: string, rgb: {r: number, g: number, b: number}, sampling: string}>}
 */
export const EXPO_GO_UNSUPPORTED_MESSAGE =
  'Color extraction is not available in Expo Go. Build and run the app with "npx expo run:ios" (or open the project in Xcode) so the native module is included.';

export async function extract8x8AverageColor(imageUri, centerX, centerY, imageWidth, imageHeight) {
  if (NATIVE_MODULE_MISSING) {
    throw new Error(EXPO_GO_UNSUPPORTED_MESSAGE);
  }

  const gridSize = 16;
  // Initialize the library with the image first (iOS: file path, Android: base64)
  try {
    await init(imageUri);
  } catch (error) {
    throw new Error(`Failed to initialize image: ${error.message}`);
  }
  
  const samples = [];
  const halfGrid = Math.floor(gridSize / 2);
  
  // Calculate grid centered on tap point
  const startX = centerX - halfGrid;
  const startY = centerY - halfGrid;
  
  // Sample pixels in the grid
  for (let dy = 0; dy < gridSize; dy++) {
    for (let dx = 0; dx < gridSize; dx++) {
      // Clamp coordinates at image edges
      const x = Math.max(0, Math.min(imageWidth - 1, startX + dx));
      const y = Math.max(0, Math.min(imageHeight - 1, startY + dy));
      
      const color = await getSinglePixelColor(x, y);
      if (color) {
        samples.push(color);
      }
    }
  }
  
  if (samples.length === 0) {
    throw new Error('Failed to sample any pixels');
  }
  
  // Convert all samples to linear RGB
  const linearSamples = samples.map(color => ({
    r: srgbToLinear(color.r),
    g: srgbToLinear(color.g),
    b: srgbToLinear(color.b),
  }));
  
  // Average in linear space
  const avgLinear = {
    r: linearSamples.reduce((sum, c) => sum + c.r, 0) / linearSamples.length,
    g: linearSamples.reduce((sum, c) => sum + c.g, 0) / linearSamples.length,
    b: linearSamples.reduce((sum, c) => sum + c.b, 0) / linearSamples.length,
  };
  
  // Convert back to sRGB
  const avgSrgb = {
    r: linearToSrgb(avgLinear.r),
    g: linearToSrgb(avgLinear.g),
    b: linearToSrgb(avgLinear.b),
  };
  
  // Convert to HEX
  const hex = rgbToHex(avgSrgb.r, avgSrgb.g, avgSrgb.b);
  
  return {
    hex,
    rgb: avgSrgb,
    sampling: `${gridSize}×${gridSize} pixel average`,
  };
}

/**
 * Map tap coordinates to original image pixel coordinates
 * Handles aspect-fit scaling
 * 
 * @param {number} tapX - X coordinate of tap on displayed image
 * @param {number} tapY - Y coordinate of tap on displayed image
 * @param {number} displayWidth - Width of displayed image view
 * @param {number} displayHeight - Height of displayed image view
 * @param {number} imageWidth - Original image width
 * @param {number} imageHeight - Original image height
 * @returns {{x: number, y: number}}
 */
export function mapTapToImageCoordinates(tapX, tapY, displayWidth, displayHeight, imageWidth, imageHeight) {
  // Calculate aspect-fit scaling
  const imageAspect = imageWidth / imageHeight;
  const displayAspect = displayWidth / displayHeight;
  
  let scaledWidth, scaledHeight, offsetX, offsetY;
  
  if (imageAspect > displayAspect) {
    // Image is wider - fit to width
    scaledWidth = displayWidth;
    scaledHeight = displayWidth / imageAspect;
    offsetX = 0;
    offsetY = (displayHeight - scaledHeight) / 2;
  } else {
    // Image is taller - fit to height
    scaledWidth = displayHeight * imageAspect;
    scaledHeight = displayHeight;
    offsetX = (displayWidth - scaledWidth) / 2;
    offsetY = 0;
  }
  
  // Adjust tap coordinates for offset
  const adjustedTapX = tapX - offsetX;
  const adjustedTapY = tapY - offsetY;
  
  // Map to original image coordinates
  const imageX = Math.round((adjustedTapX / scaledWidth) * imageWidth);
  const imageY = Math.round((adjustedTapY / scaledHeight) * imageHeight);
  
  // Clamp to image bounds
  return {
    x: Math.max(0, Math.min(imageWidth - 1, imageX)),
    y: Math.max(0, Math.min(imageHeight - 1, imageY)),
  };
}
