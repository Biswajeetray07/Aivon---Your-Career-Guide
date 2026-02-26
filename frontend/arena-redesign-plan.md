# Arena Page Redesign - Implementation Plan

The objective is to overhaul the Arena (Problems) page to reduce excessive gaps, improve data density, and enhance the "hacker GUI" aesthetic to match the premium feel of the Dashboard and Profile pages.

## Proposed Changes

### 1. HUD-style Header Integration

- **Consolidate Header & Stats**: Merge the title section and the stats cards into a single cohesive HUD (Heads-Up Display) header.
- **Reduce Padding**: Lower `pt-28` to `pt-24` and reduce margins between sections (`mb-12` -> `mb-8` or `mb-6`).
- **Compact Stats**: Instead of large cards, use a more horizontal, data-rich readout style.

### 2. Refined Control Bar

- **Seamless Integration**: Remove backgrounds where they feel heavy.
- **Improved Filter UI**: Ensure the filter trigger and buttons have the "view profile" premium feel (scanlight effect, clear borders).

### 3. "Target Matrix" Grid Enhancements

- **Dossier Style Rows**: Make each problem row feel like an operative mission dossier.
- **Unified Actions**: Replace the "ACCESS" button with a premium "ACCESS TARGET" button that matches the Dashboard CTAs.
- **Color Accents**: Use more neon green and cyan accents consistently.

### 4. Code Structure

- **Global Styles**: Ensure `outline-none` is applied to avoid focus-state blurs.
- **Animation**: Use `stagger` more effectively for a "boot sequence" feel.

## Verification Plan

### Automated Verification

- Run the `browser_subagent` to visually verify the layout and spacing.
- Take screenshots and compare with the previous baseline.

### Manual Verification

- Check responsiveness on mobile and tablet views.
- Ensure all interactive elements (search, filters, pagination) work correctly.
