# Hex Color Picker

A React Native app built with Expo + EAS that extracts accurate hex colors from static images using professional color sampling techniques.

## Features

- **Accurate Color Extraction**: Uses `@thebeka/react-native-get-pixel-color` for pixel-perfect sampling
- **8×8 Pixel Averaging**: Samples a centered 8×8 grid around tap point for accurate color representation
- **Linear RGB Conversion**: Proper sRGB ↔ linear RGB color space conversions for accurate averaging
- **Paint Mixing System**: Generates paint mix formulas using 6 professional pigments
- **Folder Organization**: Organize color swatches into custom folders
- **Persistent Storage**: All swatches saved locally (images not stored, only color data)

## Technical Architecture

### Color Extraction Pipeline

1. User taps on image
2. Tap coordinates mapped to original image pixels (handles aspect-fit scaling)
3. 8×8 grid sampled around tap point (64 pixel samples)
4. Each RGB value converted from sRGB → linear RGB
5. Channels averaged in linear space
6. Result converted back to sRGB
7. Final HEX code generated with no rounding drift

### Paint Mixing Algorithm

Allowed pigments only:
- Warm Yellow
- Cool Yellow
- Warm Red
- Magenta
- Warm Blue
- Turquoise
- White

Rules:
- No black pigment
- Darken colors using complementary pigments
- Lighten with white
- Output in percentages and parts

### Storage Format

```json
{
  "folder": "Landscape Canvas",
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
    "description": "45% Warm Blue + 35% White + 20% Turquoise"
  }
}
```

## Installation

```bash
npm install
```

## Development

### Standard Expo Development

```bash
# Start development server
npx expo start

# Run on iOS
npx expo start --ios

# Run on Android
npx expo start --android
```

### Custom Dev Client Build with EAS

This app requires a custom development client (not compatible with Expo Go) due to the native pixel color library.

1. **Install EAS CLI**:
```bash
npm install -g eas-cli
```

2. **Login to Expo**:
```bash
eas login
```

3. **Configure Project**:
```bash
eas build:configure
```

4. **Build Custom Dev Client for iOS**:
```bash
eas build --profile development --platform ios
```

5. **Install on Device**:
- Download the build from EAS dashboard
- Install on your iOS device via TestFlight or direct install

6. **Start Development Server**:
```bash
npx expo start --dev-client
```

### Production Build

```bash
# iOS
eas build --profile production --platform ios

# Android
eas build --profile production --platform android
```

## Project Structure

```
hex/
├── src/
│   ├── services/
│   │   ├── colorExtractor.js    # 8×8 sampling & linear RGB conversion
│   │   ├── paintMixer.js        # Paint mix algorithm
│   │   └── storage.js           # AsyncStorage wrapper
│   ├── screens/
│   │   ├── FolderListScreen.js  # Folder management
│   │   ├── FolderDetailScreen.js # Swatch list
│   │   └── ColorPickerScreen.js  # Image picker & color extraction
│   └── components/
│       └── SwatchCard.js         # Swatch display component
├── App.js                        # Navigation setup
├── app.json                      # Expo config
├── eas.json                      # EAS Build config
└── package.json
```

## Key Dependencies

- **@thebeka/react-native-get-pixel-color**: Native pixel color sampling (iOS/Android)
- **expo-image-picker**: Image selection from library
- **@react-native-async-storage/async-storage**: Local data persistence
- **@react-navigation/native**: Navigation framework
- **@react-navigation/native-stack**: Native stack navigator
- **react-native-safe-area-context**: Safe area support (React Navigation dependency)
- **react-native-screens**: Native screens optimization (React Navigation dependency)
- **expo-dev-client**: Custom development build support

## Platform Support

- **iOS**: Primary target (requires iOS 13.4+)
- **Android**: Supported (requires API level 21+)
- **Expo Go**: Not supported (requires custom dev client)

## Limitations

### Current Implementation

This app uses `@thebeka/react-native-get-pixel-color` as mandated. This library:
- ✅ Provides native pixel sampling on iOS/Android
- ✅ Returns accurate RGB values
- ⚠️ Requires 64 individual calls for 8×8 averaging (async overhead)
- ⚠️ May have performance considerations on very large images

### No Native Code

Per project requirements:
- ❌ No custom Swift/Objective-C code
- ❌ No custom Expo native modules
- ❌ No Canvas, Skia, or WebGL rendering
- ❌ No alternative color picker libraries

If professional-grade accuracy comparable to Adobe Color or Figma cannot be achieved with this plugin alone, this represents a technical limitation of the chosen constraint.

## Color Science Notes

### Why Linear RGB Averaging?

Averaging colors in sRGB space produces incorrect results because sRGB is gamma-encoded. Example:

```
Averaging in sRGB (incorrect):
  RGB(0, 0, 0) + RGB(255, 255, 255) = RGB(127, 127, 127) ❌ Too dark

Averaging in linear RGB (correct):
  Linear(0, 0, 0) + Linear(1, 1, 1) = Linear(0.5, 0.5, 0.5)
  → RGB(186, 186, 186) ✓ Perceptually accurate middle gray
```

This app performs proper color space conversions for physically accurate color averaging.

## License

MIT
