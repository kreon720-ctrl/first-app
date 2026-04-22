---
name: Aethelred Authority
colors:
  surface: '#141313'
  surface-dim: '#141313'
  surface-bright: '#3a3939'
  surface-container-lowest: '#0e0e0e'
  surface-container-low: '#1c1b1b'
  surface-container: '#201f1f'
  surface-container-high: '#2b2a2a'
  surface-container-highest: '#353434'
  on-surface: '#e5e2e1'
  on-surface-variant: '#c4c7c7'
  inverse-surface: '#e5e2e1'
  inverse-on-surface: '#313030'
  outline: '#8e9192'
  outline-variant: '#444748'
  surface-tint: '#c8c6c5'
  primary: '#c8c6c5'
  on-primary: '#313030'
  primary-container: '#1a1a1a'
  on-primary-container: '#848282'
  inverse-primary: '#5f5e5e'
  secondary: '#ffd795'
  on-secondary: '#422c00'
  secondary-container: '#fbb400'
  on-secondary-container: '#694900'
  tertiary: '#cac6c4'
  on-tertiary: '#31302f'
  tertiary-container: '#1b1a19'
  on-tertiary-container: '#858281'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c8c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474746'
  secondary-fixed: '#ffdea9'
  secondary-fixed-dim: '#ffba27'
  on-secondary-fixed: '#271900'
  on-secondary-fixed-variant: '#5e4100'
  tertiary-fixed: '#e6e2df'
  tertiary-fixed-dim: '#cac6c4'
  on-tertiary-fixed: '#1c1b1a'
  on-tertiary-fixed-variant: '#484645'
  background: '#141313'
  on-background: '#e5e2e1'
  surface-variant: '#353434'
typography:
  h1:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  h2:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  h3:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: '0'
  body-lg:
    fontFamily: Manrope
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: '0'
  label-caps:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '700'
    lineHeight: '1'
    letterSpacing: 0.1em
  button:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 16px
  md: 24px
  lg: 40px
  xl: 64px
  gutter: 24px
  margin: 32px
---

## Brand & Style

The design system is rooted in the "Executive Minimalism" movement. It evokes an atmosphere of high-stakes precision and unwavering authority. The target audience consists of high-performing teams and decision-makers who value clarity, speed, and premium aesthetics.

The visual style utilizes a high-contrast relationship between deep, monolithic surfaces and surgical strikes of vibrant gold. It combines the reliability of Corporate Modernism with the sleek, high-end feel of luxury automotive interfaces. The emotional response is one of confidence, exclusivity, and focused power.

## Colors

The palette is dominated by **Midnight Charcoal (#1A1A1A)**, which serves as the canvas for the entire experience. This deep neutral is used for backgrounds and primary containers to provide a sophisticated, low-fatigue environment.

**Amber Gold (#FFB703)** is the singular accent. It is used sparingly for critical actions, status indicators, and high-level branding elements. It should never occupy more than 10% of the screen real estate.

**Surface White (#F4F4F4)** is reserved for high-contrast data displays or content areas that require maximum readability against the dark backdrop. In dark mode, use subtle shifts of Charcoal to define depth, reserving the pure Surface color for text and essential UI iconography.

## Typography

This design system utilizes **Manrope** exclusively to maintain a modern, geometric, and highly legible information hierarchy. 

Headlines utilize heavy weights (Bold/ExtraBold) with tight letter-spacing to create a sense of gravitational pull and importance. Body text is set with generous line-height to ensure readability during long working sessions. Labeling and metadata use uppercase styling with increased tracking to provide an institutional, organized feel.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid Grid**. Content is housed within a 12-column structure with a maximum width of 1440px for desktop. 

The spacing rhythm is based on a **4px baseline grid**. Layouts should prioritize ample negative space to emphasize the "High-end" directive. Grouping should be tight (8px or 16px), while major sections should be separated by significant vertical gaps (40px or 64px) to create an editorial flow.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Micro-Shadows**. In the predominantly dark interface:
1. **Level 0 (Base):** #1A1A1A.
2. **Level 1 (Cards/Panels):** #242424 (a slight lift from the base).
3. **Level 2 (Popovers/Modals):** #2D2D2D with a sharp, 1px border in #333333.

Shadows are used only on the highest elevation levels. They are crisp, low-spread, and high-opacity to maintain the "Sleek" and "Sharp" aesthetic. Avoid soft, diffused ambient glows; prefer structural definition via subtle inner-borders (keylines).

## Shapes

The shape language is disciplined and architectural. Standard components utilize a **4px (Soft)** corner radius. This provides just enough approachability without sacrificing the professional, authoritative "sharp" edge requested. 

Larger containers (modals, main dashboard cards) may use **8px (rounded-lg)** to soften the overall screen composition, while interactive elements like checkboxes and small buttons remain strictly at the base 4px.

## Components

### Buttons
- **Primary:** Amber Gold (#FFB703) background with Midnight Charcoal text. Sharp 4px corners. No shadow.
- **Secondary:** Midnight Charcoal background with a 1px Amber Gold border.
- **Ghost:** Transparent background with Amber Gold text.

### Inputs
Text fields feature a dark fill (#242424) with a bottom-only 2px border that transitions from Gray to Amber Gold on focus. Labels are always "Label-Caps" style positioned above the field.

### Cards
Cards are defined by their background (#242424) rather than shadows. For "Premium" cards, include a 2px vertical accent bar of Amber Gold on the left edge.

### Chips & Badges
Chips use a de-saturated gold tint (Alpha 10% Gold) with Amber Gold text for a subtle, high-end "tag" look. 

### Data Tables
Tables are the heart of the system. Use thin #333333 horizontal dividers only. Headers use "Label-Caps" typography. High-value data points should be highlighted using the Amber Gold color.