/**
 * Paint mixing algorithm
 * Generates mix formulas using only allowed pigments:
 * - Warm Yellow
 * - Cool Yellow
 * - Warm Red
 * - Magenta
 * - Warm Blue
 * - Turquoise
 * - White
 * 
 * Rules:
 * - No black
 * - Darken with complementary colors
 * - Lighten with white
 * - Output in percentages/parts
 */

// Pigment definitions in RGB (approximate representations)
const PIGMENTS = {
  warmYellow: { r: 255, g: 200, b: 0, name: 'Warm Yellow' },
  coolYellow: { r: 255, g: 255, b: 0, name: 'Cool Yellow' },
  warmRed: { r: 255, g: 50, b: 0, name: 'Warm Red' },
  magenta: { r: 255, g: 0, b: 128, name: 'Magenta' },
  warmBlue: { r: 0, g: 100, b: 200, name: 'Warm Blue' },
  turquoise: { r: 0, g: 200, b: 200, name: 'Turquoise' },
  white: { r: 255, g: 255, b: 255, name: 'White' },
};

/**
 * Calculate color distance in RGB space
 */
function colorDistance(c1, c2) {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Calculate the perceived lightness of a color (0-100)
 */
function calculateLightness(rgb) {
  // Using relative luminance formula
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance * 100;
}

/**
 * Find the closest pigment to the target color
 */
function findClosestPigment(targetRgb) {
  let closest = null;
  let minDistance = Infinity;
  
  for (const [key, pigment] of Object.entries(PIGMENTS)) {
    if (key === 'white') continue; // White is for lightening only
    
    const distance = colorDistance(targetRgb, pigment);
    if (distance < minDistance) {
      minDistance = distance;
      closest = { key, ...pigment };
    }
  }
  
  return closest;
}

/**
 * Find complementary pigment for darkening
 */
function findComplementaryPigment(primaryPigment) {
  // Simplified complementary color logic
  const { r, g, b } = primaryPigment;
  
  // If red-dominant, use blue/turquoise
  if (r > g && r > b) {
    return colorDistance(primaryPigment, PIGMENTS.warmBlue) < 
           colorDistance(primaryPigment, PIGMENTS.turquoise)
      ? { key: 'warmBlue', ...PIGMENTS.warmBlue }
      : { key: 'turquoise', ...PIGMENTS.turquoise };
  }
  
  // If blue-dominant, use warm colors
  if (b > r && b > g) {
    return colorDistance(primaryPigment, PIGMENTS.warmRed) < 
           colorDistance(primaryPigment, PIGMENTS.warmYellow)
      ? { key: 'warmRed', ...PIGMENTS.warmRed }
      : { key: 'warmYellow', ...PIGMENTS.warmYellow };
  }
  
  // If green/yellow-dominant, use magenta/red
  return { key: 'magenta', ...PIGMENTS.magenta };
}

/**
 * Generate paint mix formula for target color
 * @param {object} targetRgb - Target RGB color {r, g, b}
 * @returns {object} Mix formula with pigments and proportions
 */
export function generatePaintMix(targetRgb) {
  const mix = {};
  const lightness = calculateLightness(targetRgb);
  
  // Find primary pigment
  const primary = findClosestPigment(targetRgb);
  
  if (!primary) {
    return {
      pigments: { white: { name: 'White', percentage: 100 } },
      totalParts: 100,
      description: 'Pure white',
    };
  }
  
  // Start with primary pigment
  let primaryAmount = 50; // Base amount
  mix[primary.key] = primaryAmount;
  
  // Handle lightness adjustment
  if (lightness > 70) {
    // Very light - add significant white
    const whiteAmount = Math.min(50, (lightness - 70) * 2);
    mix.white = whiteAmount;
    primaryAmount = 50 - whiteAmount;
    mix[primary.key] = primaryAmount;
  } else if (lightness < 30) {
    // Dark - add complementary color for darkening (no black)
    const complementary = findComplementaryPigment(primary);
    const complementaryAmount = Math.min(30, (30 - lightness) * 1.5);
    mix[complementary.key] = complementaryAmount;
  }
  
  // Check if we need secondary color for hue adjustment
  const targetHue = Math.atan2(
    Math.sqrt(3) * (targetRgb.g - targetRgb.b),
    2 * targetRgb.r - targetRgb.g - targetRgb.b
  );
  
  // Add secondary color for hue accuracy
  let secondaryKey = null;
  const allPigments = Object.entries(PIGMENTS).filter(([k]) => k !== 'white' && k !== primary.key);
  
  for (const [key, pigment] of allPigments) {
    const distance = colorDistance(targetRgb, pigment);
    if (distance < colorDistance(targetRgb, primary) * 1.5) {
      secondaryKey = key;
      break;
    }
  }
  
  if (secondaryKey && !mix[secondaryKey]) {
    mix[secondaryKey] = 15;
  }
  
  // Normalize to percentages
  const total = Object.values(mix).reduce((sum, val) => sum + val, 0);
  const percentages = {};
  
  for (const [key, value] of Object.entries(mix)) {
    const percentage = Math.round((value / total) * 100);
    if (percentage > 0) {
      percentages[key] = {
        name: PIGMENTS[key].name,
        percentage,
        parts: Math.round((value / total) * 100), // Also express as parts out of 100
      };
    }
  }
  
  // Generate description
  const sortedPigments = Object.entries(percentages)
    .sort(([, a], [, b]) => b.percentage - a.percentage)
    .map(([, p]) => `${p.percentage}% ${p.name}`)
    .join(' + ');
  
  return {
    pigments: percentages,
    totalParts: 100,
    description: sortedPigments,
    lightness: Math.round(lightness),
  };
}

/**
 * Get simplified mix instructions (easier to read)
 */
export function getSimplifiedMixInstructions(mix) {
  const { pigments } = mix;
  const entries = Object.entries(pigments).sort(([, a], [, b]) => b.percentage - a.percentage);
  
  if (entries.length === 0) {
    return 'No mix available';
  }
  
  // Express in simple ratios if possible
  const instructions = entries.map(([, pigment]) => {
    return `${pigment.parts} parts ${pigment.name}`;
  }).join('\n');
  
  return instructions;
}
