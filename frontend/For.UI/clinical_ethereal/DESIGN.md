---
name: Clinical Ethereal
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#434655'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#00687a'
  on-secondary: '#ffffff'
  secondary-container: '#57dffe'
  on-secondary-container: '#006172'
  tertiary: '#005b7c'
  on-tertiary: '#ffffff'
  tertiary-container: '#00759f'
  on-tertiary-container: '#e1f2ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#acedff'
  secondary-fixed-dim: '#4cd7f6'
  on-secondary-fixed: '#001f26'
  on-secondary-fixed-variant: '#004e5c'
  tertiary-fixed: '#c4e7ff'
  tertiary-fixed-dim: '#7bd0ff'
  on-tertiary-fixed: '#001e2c'
  on-tertiary-fixed-variant: '#004c69'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
  success: '#10B981'
  warning: '#F59E0B'
  danger: '#EF4444'
  card-surface: '#FFFFFF'
  border-subtle: '#E2E8F0'
  text-heading: '#0F172A'
  text-body: '#64748B'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.01em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  margin-page: 2rem
  gutter-grid: 1.5rem
  container-max: 1440px
  stack-sm: 0.5rem
  stack-md: 1rem
  stack-lg: 2rem
---

## Brand & Style

The design system is anchored in the concept of **"Clinical Ethereal"**—a blend of high-precision enterprise software and the calming, human-centered aesthetics of Scandinavian luxury. The target audience includes healthcare administrators and practitioners who require high-density data without the cognitive load typically associated with medical software.

The style is **Minimalist & Glassmorphic**. It draws inspiration from Apple’s HIG and Stripe’s dashboard clarity. It utilizes heavy whitespace, subtle translucent layers to imply depth, and a "Human-Centered" layout that prioritizes patient outcomes over technical complexity. The interface should feel like a premium, quiet tool that assists rather than intrudes.

## Colors

The palette is designed for AAA accessibility and professional trust. 
- **Primary & Secondary:** A professional blue-to-cyan spectrum creates a sense of "Clean Tech" and medical reliability.
- **Surface Strategy:** The background uses a very cool, high-lightness gray (`#F8FAFC`) to allow white cards to "pop" via soft shadows rather than harsh borders.
- **Functional Colors:** Success, Warning, and Danger colors are calibrated to be vibrant but not jarring, maintaining the calm Scandinavian aesthetic.
- **Text:** High contrast is maintained using a near-black for headings to ensure readability, while secondary text uses a soft slate to reduce visual noise in data-heavy views.

## Typography

This design system uses **Inter** exclusively to achieve a systematic, utilitarian, yet modern feel. 
- **Editorial Influence:** Large headlines use tight letter-spacing and significant line-height to create a premium, "magazine-like" feel for dashboard summaries.
- **Numbers:** Tabular figures (tnum) should be enabled for all data tables and charts to ensure vertical alignment of digits.
- **Hierarchy:** We utilize weight (SemiBold/Bold) rather than color shifts alone to denote importance, ensuring the UI remains accessible and clear.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. While the main content container caps at 1440px to prevent excessive line lengths on ultra-wide monitors, the internal grid is fluid.
- **Grid:** A 12-column grid with 24px (1.5rem) gutters provides the structural backbone.
- **Sidebar:** A fixed 280px left navigation creates a permanent anchor for the user.
- **Rhythm:** An 8px linear scaling system is used for all internal padding and margins. Generous "breathing room" (32px+) is required between major sections to maintain the Scandinavian influence.

## Elevation & Depth

Elevation is achieved through **Tonal Layering and Glassmorphism** rather than traditional heavy shadows.
- **Subtle Glass:** Overlays (Command Palette, Popovers) use a `backdrop-filter: blur(12px)` with a semi-transparent white background (`rgba(255, 255, 255, 0.7)`).
- **Soft Shadows:** Cards use a multi-layered shadow approach: a very soft, diffused ambient shadow (0px 4px 20px rgba(15, 23, 42, 0.05)) and a 1px internal white stroke to simulate a beveled edge.
- **Z-Index Strategy:** Depth is used to imply focus. The Command Palette sits on the highest "Ethereal" layer, while cards sit on the "Surface" layer.

## Shapes

The shape language is defined by **Ultra-Soft Geometry**. 
- **Cards & Containers:** Following the requirement, a signature `24px` (1.5rem) radius is applied to all primary containers and cards.
- **Buttons & Inputs:** These use a smaller `8px` or `12px` radius to maintain a professional, clickable appearance while still feeling soft.
- **Interactive States:** Hover states should slightly increase the perceived elevation through a subtle scale transform (e.g., `scale(1.01)`) rather than just a color change.

## Components

### Premium Sidebar
The sidebar is the primary navigation anchor. It should feature a semi-transparent background with a subtle right-border. Active states use a soft blue tint with a vertical "pill" indicator. Groupings (Patients, CRM, Analytics) are separated by clear, uppercase labels in `label-sm`.

### Glassmorphic Cards
Containers for data and charts. They must have a white background, 24px border radius, and a 1px border using `#E2E8F0`. Use a subtle inner glow or top-shadow to give them a "lifted" appearance from the slate background.

### High-Fidelity Tables
Tables should avoid vertical borders. Use horizontal dividers only. Rows should have a generous 16px vertical padding. Use `label-md` for headers with a light-gray text color.

### Command Palette
The "Linear-inspired" command palette should be centered, floating, and utilize the glassmorphic blur. It should be triggered by `Cmd+K` and offer instant search across Patients, Appointments, and AI Receptionist settings.

### Charts & Progress Rings
Charts use the primary (`#2563EB`) and secondary (`#06B6D4`) colors. Progress rings for medical metrics should use a thick stroke with rounded caps to match the system's overall soft geometry.