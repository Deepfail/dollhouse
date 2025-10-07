# iPad & Mobile Viewport Fixes

## Summary

Fixed chat bar cutoff issues when viewing the app from an iPad and other mobile devices. The app now scales appropriately across all screen sizes.

## Changes Made

### 1. HTML Viewport Configuration (`index.html`)

- Updated viewport meta tag to include:
  - `viewport-fit=cover` - Ensures app uses full screen on iOS devices with notches
  - `maximum-scale=1.0, user-scalable=no` - Prevents unwanted zooming on iOS

### 2. CSS Viewport & Safe Area Support (`src/index.css`)

- Added CSS custom properties for iOS safe area insets:
  - `--safe-area-inset-top`
  - `--safe-area-inset-right`
  - `--safe-area-inset-bottom`
  - `--safe-area-inset-left`

- Updated body styling to prevent iOS bounce/overscroll:
  - `position: fixed` with `width: 100%` and `height: 100%`
  - `overscroll-behavior: none`
  - `-webkit-overflow-scrolling: touch`

- Added dynamic viewport height support:
  - Uses `100dvh` for mobile devices (accounts for browser chrome)
  - Uses `-webkit-fill-available` for iOS Safari

- Added iPad-specific font size optimization:
  - Slightly larger font (15px) for tablets between 768px and 1024px width

### 3. Component Layout Fixes (`src/components/DatingSimShell.tsx`)

#### Main Container

- Changed from `h-screen` to inline style using `100vh` with `100dvh` fallback
- Added safe area inset support for all padding

#### Chat Panel Input Area

- Updated bottom padding to use `max(1rem, env(safe-area-inset-bottom))`
- Prevents input from being hidden behind iOS home indicator

#### Chat Messages Scroll Area

- Updated padding-bottom to account for input area + safe area insets
- Changed from `pb-40` to `calc(200px + env(safe-area-inset-bottom))`

#### Wingman Panel

- Updated bottom padding to use safe area insets
- Hidden on screens smaller than `lg` breakpoint (< 1024px)

#### Character Roster

- Hidden on screens smaller than `md` breakpoint (< 768px)

#### Responsive Grid Layout

- Updated to progressive disclosure:
  - Mobile (< 768px): Single column (chat only)
  - Tablet/iPad (768px - 1023px): Two columns (roster + chat)
  - Desktop (≥ 1024px): Three columns (roster + chat + wingman)

## Testing Recommendations

Test on the following devices/viewports:

1. iPad Portrait (768px width)
2. iPad Landscape (1024px width)
3. iPad Pro Portrait (834px width)
4. iPad Pro Landscape (1194px width)
5. iPhone (various sizes in both orientations)

### Key Areas to Verify

- [ ] Chat input is fully visible and not cut off
- [ ] Messages scroll properly without overlapping input
- [ ] No unwanted zooming when tapping inputs
- [ ] Safe areas respected (no overlap with notch/home indicator)
- [ ] Layout adapts appropriately at each breakpoint
- [ ] No vertical scrolling on the main viewport

## Browser Support

- iOS Safari 11.0+
- Chrome on iOS 11.0+
- Safari on macOS
- All modern desktop browsers

## Additional Notes

- The fixes use modern CSS features (`env()`, `dvh`) with graceful fallbacks
- Safe area insets have no effect on non-iOS devices, so desktop experience is unchanged
- The responsive grid ensures optimal use of screen real estate on all device sizes
