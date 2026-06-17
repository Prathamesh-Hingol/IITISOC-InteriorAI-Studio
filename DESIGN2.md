---
name: Architectural Minimalist
colors:
  surface: '#fbf9f9'
  surface-dim: '#dbdad9'
  surface-bright: '#fbf9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f3'
  surface-container: '#efeded'
  surface-container-high: '#e9e8e7'
  surface-container-highest: '#e3e2e2'
  on-surface: '#1b1c1c'
  on-surface-variant: '#404946'
  inverse-surface: '#303031'
  inverse-on-surface: '#f2f0f0'
  outline: '#707976'
  outline-variant: '#c0c8c5'
  surface-tint: '#36675c'
  primary: '#00362d'
  on-primary: '#ffffff'
  primary-container: '#1a4d43'
  on-primary-container: '#8abdb0'
  inverse-primary: '#9ed1c3'
  secondary: '#586062'
  on-secondary: '#ffffff'
  secondary-container: '#dae1e3'
  on-secondary-container: '#5d6466'
  tertiary: '#2f2f2c'
  on-tertiary: '#ffffff'
  tertiary-container: '#464542'
  on-tertiary-container: '#b5b3ae'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#b9eddf'
  primary-fixed-dim: '#9ed1c3'
  on-primary-fixed: '#00201a'
  on-primary-fixed-variant: '#1c4f45'
  secondary-fixed: '#dde4e6'
  secondary-fixed-dim: '#c1c8ca'
  on-secondary-fixed: '#161d1f'
  on-secondary-fixed-variant: '#41484a'
  tertiary-fixed: '#e5e2dd'
  tertiary-fixed-dim: '#c9c6c2'
  on-tertiary-fixed: '#1c1c19'
  on-tertiary-fixed-variant: '#474743'
  background: '#fbf9f9'
  on-background: '#1b1c1c'
  surface-variant: '#e3e2e2'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '600'
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
    fontWeight: '500'
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
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  container-margin: 24px
  gutter: 16px
  sidebar-width: 280px
  toolbar-height: 56px
---

## Brand & Style
The brand personality is authoritative yet invisible—a sophisticated tool that empowers the user's creativity without overshadowing it. It targets professional interior designers and high-end homeowners who value precision, spatial harmony, and effortless digital experiences.

The design style is **Modern Minimalist with Glassmorphic accents**. It draws heavily from professional creative tools like Figma and Miro, utilizing a "workspace" metaphor where the UI recedes to prioritize the canvas. It balances architectural structure with soft, organic depth to evoke a sense of premium craftsmanship. The emotional response should be one of "calm productivity" and "curated luxury."

## Colors
The palette is rooted in a "Neutral Luxury" philosophy. 
- **Primary (Forest Green):** Used exclusively for high-intent actions, success states, and brand signatures. It feels grounded and timeless.
- **Secondary (Charcoal):** Used for typography and iconography to provide a sharp, professional contrast against light backgrounds.
- **Tertiary (Soft Beige):** Used for subtle surface backgrounds and containers to avoid the sterile feel of pure white, adding warmth to the architectural grid.
- **Neutral:** A range of warm grays used for borders, secondary text, and disabled states.

The interface primarily operates in a light mode to maximize the clarity of architectural imagery, utilizing semi-transparent glass layers for floating toolbars and inspectors.

## Typography
The typography system uses **Inter** to maintain a technical, clean, and modern appearance. The hierarchy is established through intentional scaling and generous letter spacing for labels to create an "editorial" feel within a SaaS environment.

- **Headlines:** Set with slight negative letter-spacing to appear tight and architectural.
- **Labels:** Small caps or uppercase with increased tracking are used for UI metadata and section headers to differentiate navigation from content.
- **Body:** Open line-heights (1.6x) ensure long-form descriptions of materials or design concepts remain highly readable.

## Layout & Spacing
The design system employs a **Fluid Workspace model**. The main canvas is infinite and non-restricted, while the UI overlays (toolbars, sidebars) follow a strict 4px baseline grid.

- **Desktop:** Features a persistent or collapsible left sidebar for project assets (280px) and a right-side inspector for AI controls. 
- **Toolbars:** Centered floating glass dock at the bottom of the viewport or pinned to the top.
- **Margins:** A standard 24px safety margin is maintained for all floating elements from the viewport edge.
- **Responsive:** On mobile, sidebars collapse into bottom sheets; the primary canvas remains the focal point with minimal icon-only toolbars.

## Elevation & Depth
Depth is created through **Backdrop Blurs (Glassmorphism)** rather than heavy shadows. This maintains a sense of lightness and transparency, mimicking an architect's tracing paper.

1.  **Level 0 (Canvas):** Flat, subtle grid or warm beige background.
2.  **Level 1 (Cards/Panels):** Pure white with a 1px soft gray border or a very low-opacity ambient shadow (Blur 15px, Opacity 4%).
3.  **Level 2 (Toolbars/Modals):** Semi-transparent white (`rgba(255, 255, 255, 0.7)`) with a 20px backdrop-filter blur and a 0.5px white internal stroke to simulate the edge of glass.
4.  **Level 3 (Active Popovers):** Higher contrast shadows to indicate immediate focus and interaction.

## Shapes
The shape language balances professional precision with approachable softness.
- **Standard UI (Buttons, Inputs):** 0.5rem (8px) for a controlled, modern look.
- **Containers (Cards, Sidebars):** 1rem (16px) to 1.5rem (24px) for a softer, premium furniture-like feel.
- **Pills:** Used exclusively for status indicators or "AI-powered" tags to denote a more organic, dynamic feature.

## Components
- **Buttons:** Primary buttons use the Forest Green background with white text. Secondary buttons use a ghost style with a thin border. Hover states should include a subtle scale-up (1.02x) and a slight increase in shadow depth.
- **Floating Toolbars:** Glassmorphic containers with icon-only buttons. Active states are indicated by a subtle secondary gray background-fill behind the icon.
- **AI Version Trees:** A specialized component using thin 1px lines to connect project iterations, utilizing small circular nodes that expand into image previews on hover.
- **Property Inspectors:** Compact rows with 12px labels and inline inputs. Use custom-designed sliders for opacity and material "strength" settings.
- **Image Cards:** Minimalist frames with no visible borders until hover; on hover, reveal a glassmorphic action bar for "Edit," "Delete," or "Upscale."
- **Inputs:** Understated bottom-border only or very light gray fills that turn into a defined Charcoal border when focused.