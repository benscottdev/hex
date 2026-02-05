import { getPixelColor } from '@thebeka/react-native-get-pixel-color';

/**
 * Color extraction service using @thebeka/react-native-get-pixel-color
 * Implements 8×8 averaging with proper sRGB ↔ linear RGB conversion
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
 * Extract color from a single pixel
 * @param {string} imageUri - URI of the image
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {Promise<{r: number, g: number, b: number} | null>}
 */
async function getSinglePixelColor(imageUri, x, y) {
  try {
    const color = await getPixelColor(imageUri, x, y);
    
    // Parse the color format returned by the library
    // The library may return different formats, typically: {r, g, b} or rgb(r, g, b)
    if (typeof color === 'object' && color.r !== undefined) {
      return { r: color.r, g: color.g, b: color.b };
    }
    
    // If string format like "rgb(r, g, b)", parse it
    if (typeof color === 'string') {
      const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        return {
          r: parseInt(match[1], 10),
          g: parseInt(match[2], 10),
          b: parseInt(match[3], 10),
        };
      }
    }
    
    return null;
  } catch (error) {
    console.warn(`Failed to get pixel at (${x}, ${y}):`, error.message);
    return null;
  }
}

/**
 * Extract color from an 8×8 pixel grid around a tap point
 * Performs proper linear RGB averaging
 * 
 * @param {string} imageUri - URI of the image
 * @param {number} centerX - Center X coordinate
 * @param {number} centerY - Center Y coordinate
 * @param {number} imageWidth - Original image width
 * @param {number} imageHeight - Original image height
 * @returns {Promise<{hex: string, rgb: {r: number, g: number, b: number}, sampling: string}>}
 */
export async function extract8x8AverageColor(imageUri, centerX, centerY, imageWidth, imageHeight) {
  const samples = [];
  
  // Calculate 8×8 grid centered on tap point
  const startX = centerX - 4;
  const startY = centerY - 4;
  
  // Sample 64 pixels in an 8×8 grid
  for (let dy = 0; dy < 8; dy++) {
    for (let dx = 0; dx < 8; dx++) {
      // Clamp coordinates at image edges
      const x = Math.max(0, Math.min(imageWidth - 1, startX + dx));
      const y = Math.max(0, Math.min(imageHeight - 1, startY + dy));
      
      const color = await getSinglePixelColor(imageUri, x, y);
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
    sampling: '8x8 average via react-native-get-pixel-color',
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
