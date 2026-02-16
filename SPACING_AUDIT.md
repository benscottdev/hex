# Spacing Audit Summary

## Theme Updates (`src/theme/ios.js`)

### Standardized Spacing
- **screenPadding**: 20px (horizontal margins for headers)
- **listInset**: 20px (horizontal margins for lists/content)
- **sectionPadding**: 20px (modal/sheet padding)
- **cardPadding**: 16px (internal card padding)
- **gap**: 12px (standard spacing between elements)
- **gapLarge**: 20px (larger spacing between sections)

## Screen-by-Screen Changes

### DashboardScreen
- ✅ Horizontal margins: 20px (listInset)
- ✅ Bottom padding: 100px (prevents tab bar cutoff)
- ✅ Section spacing: 24px
- ✅ Empty state padding: 32px vertical, 20px horizontal
- ✅ Recent circles gap: 12px
- ✅ Card padding: 16px

### FolderListScreen
- ✅ Horizontal margins: 20px (listInset)
- ✅ Bottom padding: 100px
- ✅ Cell padding: 16px vertical, 16px horizontal
- ✅ Empty state: 60px vertical, 20px horizontal
- ✅ Input padding: 14px

### FolderDetailScreen
- ✅ Bottom padding: 100px
- ✅ Empty state: 60px vertical, 20px horizontal

### AllSwatchesScreen
- ✅ Bottom padding: 100px
- ✅ Empty state: 60px vertical, 20px horizontal

### ColorPickerScreen
- ✅ Horizontal margins: 20px (listInset)
- ✅ Bottom padding: 100px
- ✅ Empty state: 60px vertical, 20px horizontal
- ✅ Image container: 20px horizontal padding
- ✅ Result container: 20px horizontal, 20px vertical
- ✅ Mix container: 16px internal padding
- ✅ All buttons: 20px border radius

### SettingsScreen
- ✅ Horizontal margins: 20px (listInset)
- ✅ Bottom padding: 100px
- ✅ Section spacing: 20px
- ✅ Footer padding: 32px vertical, 20px horizontal

### SwatchCard
- ✅ Horizontal margins: 20px (listInset)
- ✅ Card padding: 16px
- ✅ Border radius: 24px
- ✅ Margin bottom: 12px

### SwatchDetailSheet
- ✅ Color preview: 140px height, 20px margin bottom
- ✅ Section spacing: 16-20px
- ✅ Button border radius: 20px

### CustomTabBar
- ✅ Height: 88px (reduced from 100px for lighter feel)
- ✅ Slot padding bottom: 12px
- ✅ Scan button margin: 12px
- ✅ Border radius: 20px (top corners)

## Design Principles Applied

1. **Consistent horizontal margins**: All screens use 20px (listInset)
2. **Generous bottom padding**: 100px on all scrollable screens prevents tab bar overlap
3. **Light and airy**: Reduced padding from 24px to 16-20px where appropriate
4. **Rounded corners**: 20-24px for modern, soft feel
5. **Empty states**: 60px vertical padding for breathing room
6. **Cards**: 16px internal padding, 24px border radius
7. **Buttons**: 20px border radius, 12-16px vertical padding
8. **Sections**: 20-24px spacing between major sections

## No Cutoffs
- All scrollable content has 100px bottom padding
- Tab bar height optimized at 88px
- Safe area insets properly handled
- Modal sheets have appropriate padding

## Modern & Fluffy
- Softer shadows (opacity 0.06-0.08)
- Larger border radii (20-24px)
- Consistent 12-20px spacing
- Warm cream background (#FDFBF7)
- Light, breathable layouts
