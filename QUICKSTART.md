# Quick Start Guide

## Development Build with Custom Dev Client

Since this app uses `@thebeka/react-native-get-pixel-color` (a native module), it requires a custom development client and cannot run in Expo Go.

### Initial Setup

All dependencies are already installed, including:

- `@thebeka/react-native-get-pixel-color` (pixel sampling)
- `expo-image-picker` (image selection)
- `@react-native-async-storage/async-storage` (persistence)
- `react-native-safe-area-context` (React Navigation)
- `react-native-screens` (React Navigation)

### Option 1: EAS Build (Recommended)

1. **Install EAS CLI**:

```bash
npm install -g eas-cli
```

2. **Login to Expo**:

```bash
eas login
```

3. **Build Development Client**:

```bash
# For iOS
eas build --profile development --platform ios

# For Android
eas build --profile development --platform android
```

4. **Install the build on your device** (via TestFlight or direct install from EAS dashboard)

5. **Start dev server**:

```bash
npx expo start --dev-client
```

### Option 2: Local Build (iOS only, requires macOS + Xcode)

1. **Run local iOS build**:

```bash

```

This will:

- Build the app locally with Xcode
- Install it on the iOS Simulator
- Start the Metro bundler

### Option 3: Verify Setup Without Running

Check that all files are in place:

```bash
# View project structure
ls -la src/

# Check dependencies
npm list @thebeka/react-native-get-pixel-color
npm list expo-image-picker
npm list @react-native-async-storage/async-storage
```

## Key Files

### Services

- `src/services/colorExtractor.js` - 8×8 pixel sampling with linear RGB conversion
- `src/services/paintMixer.js` - Paint mixing algorithm (6 pigments)
- `src/services/storage.js` - AsyncStorage wrapper for persistence

### Screens

- `src/screens/FolderListScreen.js` - Folder management
- `src/screens/FolderDetailScreen.js` - Swatch collection view
- `src/screens/ColorPickerScreen.js` - Image picker + tap-to-sample

### Components

- `src/components/SwatchCard.js` - Color swatch display card

## How It Works

1. **Create a folder** from the home screen
2. **Tap the folder** to view swatches
3. **Tap "Add Color"** to pick an image
4. **Tap anywhere on the image** to extract color
5. The app will:
   - Sample a centered 8×8 pixel grid (64 samples)
   - Convert each pixel from sRGB → linear RGB
   - Average in linear space
   - Convert back to sRGB → HEX
   - Generate paint mix formula
6. **Save the swatch** to the folder

## Technical Constraints (Per Requirements)

MUST USE: `@thebeka/react-native-get-pixel-color` for all pixel sampling

CANNOT USE:

- Custom Swift/Objective-C code
- Custom Expo native modules
- Alternative color picker libraries
- Canvas, Skia, or WebGL
- Expo Go (requires custom dev client)

## Color Science

### Linear RGB Conversion

The app uses proper color space conversions:

```javascript
// sRGB → Linear
function srgbToLinear(srgb) {
	const normalized = srgb / 255;
	if (normalized <= 0.04045) {
		return normalized / 12.92;
	}
	return Math.pow((normalized + 0.055) / 1.055, 2.4);
}

// Linear → sRGB
function linearToSrgb(linear) {
	if (linear <= 0.0031308) {
		return Math.round(linear * 12.92 * 255);
	}
	return Math.round((1.055 * Math.pow(linear, 1 / 2.4) - 0.055) * 255);
}
```

This ensures physically accurate color averaging.

### 8×8 Sampling

The app calls `getPixelColor()` 64 times in a centered grid around the tap point:

```
[x-4,y-4] ... [x+3,y-4]
    ...          ...
[x-4,y+3] ... [x+3,y+3]
```

Coordinates are clamped at image edges.

### Paint Mixing

Uses only these pigments:

- Warm Yellow
- Cool Yellow
- Warm Red
- Magenta
- Warm Blue
- Turquoise
- White

Rules:

- No black (darken with complementary colors)
- Lighten with white
- Output as percentages/parts

## Troubleshooting

### Pod Install Fails

If you see pod install errors during prebuild, try:

```bash
cd ios && pod install && cd ..
```

### Pixel Color Library Errors

The library requires React 16.8+ but works with React 19 using `--legacy-peer-deps` (already configured in `.npmrc`).

### Build Errors

Make sure you're using the custom dev client, not Expo Go:

```bash
# Wrong (will fail)
expo start

# Right
npx expo start --dev-client
```

## Storage Format

Swatches are stored in AsyncStorage (images NOT stored):

```json
{
	"id": "1738721234567",
	"folderId": "1738721234500",
	"folderName": "Landscape Canvas",
	"hex": "#8FA3B2",
	"rgb": { "r": 143, "g": 163, "b": 178 },
	"sampling": "8x8 average via react-native-get-pixel-color",
	"mix": {
		"pigments": {
			"warmBlue": { "name": "Warm Blue", "percentage": 45, "parts": 45 },
			"white": { "name": "White", "percentage": 35, "parts": 35 },
			"turquoise": { "name": "Turquoise", "percentage": 20, "parts": 20 }
		},
		"totalParts": 100,
		"description": "45% Warm Blue + 35% White + 20% Turquoise",
		"lightness": 68
	},
	"createdAt": 1738721234567
}
```

## Next Steps

1. Build the development client (EAS or local)
2. Install on device/simulator
3. Run `npx expo start --dev-client`
4. Test color extraction on real images
5. Verify 8×8 averaging accuracy
6. Check paint mix formulas
7. Test folder/swatch persistence

## Production Build

When ready for production:

```bash
# iOS
eas build --profile production --platform ios

# Android
eas build --profile production --platform android
```
