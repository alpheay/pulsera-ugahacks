# Plan 1 — Logo Redesign + Navbar Redesign

**Overall Progress: 100%**

**References**:
- `docs/assets/pulserareference.png` — logo target look
- Eva AI navbar screenshot — navbar structure reference

---

## Checklist

### Phase A — Logo (1.1–1.12)

- 🟩 1.1 — Extract Garet font files from `docs/assets/garet.zip` into `web/public/fonts/`
- 🟩 1.2 — Register Garet font via `next/font/local` in the app layout
- 🟩 1.3 — Create `PulseraIcon.tsx` — SVG with two stacked bracelet rings only (no text)
- 🟩 1.4 — Create `PulseraWordmark.tsx` — "pulsera" text only in Garet Heavy (no rings)
- 🟩 1.5 — Create `PulseraLogo.tsx` — full logo composing PulseraIcon + PulseraWordmark side by side
- 🟩 1.6 — Generate favicon from PulseraIcon (two rings)
- 🟩 1.7 — Update landing page header to use `PulseraLogo`
- 🟩 1.8 — Remove logo/decoration from hero section (right column)
- 🟩 1.9 — Update landing page footer to use `PulseraWordmark` (text only)
- 🟩 1.10 — Update dashboard header to use `PulseraLogo`
- 🟩 1.11 — Clean up: remove old `BraceletLogo.tsx`, remove unused Work Sans import
- 🟩 1.12 — Visual QA and build verification (logo phase)

### Phase B — Navbar Redesign (2.1–2.4)

- 🟩 2.1 — Create `Navbar.tsx` component — centered floating frosted glass bar (Eva AI layout)
- 🟩 2.2 — Replace current landing page header with new `Navbar`
- 🟩 2.3 — Update dashboard to use same `Navbar` component (light variant)
- 🟩 2.4 — Visual QA and build verification (navbar phase)

### Phase C — Dither Background Interactivity (3.1–3.2)

- 🟩 3.1 — Ensure Dither mouse interaction works: fix pointer-events pass-through on all overlay elements (navbar, frosted glass panel, empty columns)
- 🟨 3.2 — Visual QA: confirm mouse hover visibly distorts the dither waves in real-time

---

## Intended Outcome / UX / UI

### Three Logo Variants

We create **three separate components** for different contexts:

```
VARIANT 1: PulseraIcon (icon only — for favicon, app icons, compact uses)
  ┌─────────┐
  │ ╭─────╮ │
  │ │ ═══ │ │   Two stacked bracelet rings
  │ ╰─────╯ │   from bracelet.svg path
  │ ╭─────╮ │
  │ │ ═══ │ │
  │ ╰─────╯ │
  └─────────┘

VARIANT 2: PulseraWordmark (text only — for footer, minimal contexts)
  pulsera        ← Garet Heavy, all lowercase

VARIANT 3: PulseraLogo (full — for headers, primary branding)
  ┌─────────┐
  │ ╭─────╮ │
  │ │ ═══ │ │
  │ ╰─────╯ │
  │ ╭─────╮ │    pulsera
  │ │ ═══ │ │    ↑ Garet Heavy, vertically centered with ring stack
  │ ╰─────╯ │
  └─────────┘
```

### Reference Image Analysis (`pulserareference.png`)

The reference shows VARIANT 3 (full logo):
- Two **identical** copies of the `bracelet.svg` path, stacked with a small gap (~25-30% of ring height)
- "pulsera" in **Garet Heavy**, all lowercase, vertically centered with the ring stack
- Everything **one color** (adapts to context)
- The "p" starts close to the right edge of the rings

### Color behavior:
- **Dark backgrounds** (landing page): `#FFF1E6` (cream/ivory)
- **Light backgrounds** (dashboard): `#2D2418` (dark charcoal)
- All components accept a `color` prop, default `currentColor`

### Where each variant appears:

| Variant | Where | Notes |
|---------|-------|-------|
| **PulseraLogo** (full) | Navbar (landing + dashboard) | Inside the frosted glass bar |
| **PulseraIcon** (rings only) | Favicon (`icon.svg`) | Two rings as browser tab icon |
| **PulseraWordmark** (text only) | Landing page footer | "pulsera" in Garet Heavy, no rings |
| ~~Hero section~~ | **REMOVED** | Decorative logo/rings removed entirely |

### Navbar Redesign (Eva AI style)

**Reference**: Eva AI screenshot — centered floating navbar.

**Current state** (Pulsera):
```
┌──────────────────────────────────────────────────────┐
│ 🔗 pulsera          About   Features   Contact      │  ← full-width, no background
└──────────────────────────────────────────────────────┘
```

**Target state** (Eva AI structure + Pulsera frosted glass):
```
         ╭───────────────────────────────────────────────────╮
         │ [🔗 pulsera]       Features   About   [Open Dashboard →] │
         │  ↑ logo (left)     ↑ nav links (middle-right)  ↑ CTA (far right) │
         ╰───────────────────────────────────────────────────╯
                              ↑ centered, floating, frosted glass pill
```

**Mapping from Eva AI → Pulsera**:
| Eva AI | Pulsera |
|--------|---------|
| Eva AI logo (icon + text) | PulseraLogo (rings icon + "pulsera" wordmark) |
| "ES" language selector | "Features" text link |
| "Log in" text link | "About" text link |
| "Agendar Demo →" CTA button | "Open Dashboard →" CTA button (same text as current landing page CTA) |

**Key details**:
- **Centered** — not full-width, has a defined max-width, sits centered at top
- **Floating pill shape** — rounded-full or large border-radius, sits with top margin
- **Frosted glass texture** — SAME as the current "Care that connects" panel:
  ```css
  background: linear-gradient(135deg, rgba(20,8,6,0.72), rgba(35,12,10,0.58), rgba(20,8,6,0.65))
  backdrop-filter: blur(32px) saturate(1.4)
  border: 1px solid rgba(255,241,230,0.06)
  box-shadow: 0 8px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,241,230,0.04)
  ```
- **Left side**: PulseraLogo (icon + wordmark)
- **Right side**: "Features" and "About" as text links (DM Sans, muted cream, uppercase tracking — same style as current nav links), then "Open Dashboard →" CTA button as the rightmost element
- **CTA button style**: Outlined/border pill style like Eva's "Agendar Demo →" — `rounded-full`, subtle border, arrow icon. Uses cream text with border on dark, or crimson `#E8524A` accent.
- **"Contact" removed** — only Features and About stay as nav links
- **Responsive**: On mobile, the bar shrinks; nav links may hide, logo + CTA stay visible

---

## Technical Design

### 1.1 — Extract Garet fonts

Extract from `docs/assets/garet.zip` into `web/public/fonts/`:
- `Garet-Heavy.woff2` (primary — logo text)
- `Garet-Heavy.woff` (fallback)
- `Garet-Book.woff2` (future use)
- `Garet-Book.woff` (fallback)

Only .woff2 and .woff needed for web. Skip .ttf and .otf.

### 1.2 — Register Garet via next/font/local

In `web/src/app/layout.tsx`:

```tsx
import localFont from "next/font/local";

const garet = localFont({
  src: [
    { path: "../../public/fonts/Garet-Book.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/Garet-Heavy.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-garet",
  display: "swap",
});
```

Apply `garet.variable` to `<html>` or `<body>` className → `var(--font-garet)` available globally.

### 1.3 — Create `PulseraIcon.tsx` (rings only)

New file: `web/src/components/PulseraIcon.tsx`

Inline SVG with two stacked bracelet rings. No text.

```tsx
interface PulseraIconProps {
  className?: string;
  size?: number;      // icon height in px
  color?: string;     // defaults to "currentColor"
}
```

**SVG structure**:
```tsx
<svg viewBox="0 28 100 82" width={size} height={size} fill={color}>
  <path d="...bracelet ring path..." />                           {/* ring 1 */}
  <g transform="translate(0, 42)">
    <path d="...bracelet ring path..." />                         {/* ring 2 */}
  </g>
</svg>
```

**Ring calculations**:
- Original path occupies y≈33 to y≈67 (height ≈34 units)
- Gap between rings ≈ 8 units (~25% of ring height, per reference)
- Second ring translated 42 units down (34 height + 8 gap)
- viewBox tightened to fit both: `0 28 100 82` approx (will fine-tune during implementation)

### 1.4 — Create `PulseraWordmark.tsx` (text only)

New file: `web/src/components/PulseraWordmark.tsx`

Just the text "pulsera" in Garet Heavy. No icon.

```tsx
interface PulseraWordmarkProps {
  className?: string;
  size?: number;      // font-size in px
  color?: string;     // defaults to "currentColor"
}
```

**Implementation**:
```tsx
<span
  style={{
    fontFamily: "var(--font-garet)",
    fontWeight: 800,
    fontSize: size,
    color: color,
    letterSpacing: "-0.02em",
  }}
>
  pulsera
</span>
```

### 1.5 — Create `PulseraLogo.tsx` (full logo)

New file: `web/src/components/PulseraLogo.tsx`

Composes PulseraIcon + PulseraWordmark side by side.

```tsx
interface PulseraLogoProps {
  className?: string;
  size?: number;      // controls overall height — icon and text scale proportionally
  color?: string;     // defaults to "currentColor"
}
```

**Implementation**:
```tsx
<div style={{ display: "flex", alignItems: "center", gap: "..." }}>
  <PulseraIcon size={iconSize} color={color} />
  <PulseraWordmark size={fontSize} color={color} />
</div>
```

The `size` prop sets the icon height. Text font-size is calculated proportionally (text height ≈ 60-70% of icon height, matching reference proportions).

### 1.6 — Generate favicon from PulseraIcon

Replace `web/src/app/favicon.ico` with the two-ring icon.

**Preferred**: Use `icon.svg` in `web/src/app/` — Next.js App Router automatically picks up `icon.svg` as the favicon. Vector-based, no pixelation.

**File**: `web/src/app/icon.svg`
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="...">
  <path d="...ring 1..." />
  <g transform="translate(0, 42)">
    <path d="...ring 2..." />
  </g>
</svg>
```

Delete the old `favicon.ico`.

### 1.7 — Update landing page header

In `web/src/app/page.tsx`, line 46-53:

**Before**:
```tsx
<div className="flex items-center gap-3">
  <BraceletLogo size={36} color="#FFF1E6" />
  <span style={{ fontFamily: "'Work Sans', sans-serif", fontWeight: 700 }}>
    Pulsera
  </span>
</div>
```

**After**:
```tsx
<PulseraLogo size={36} color="#FFF1E6" />
```

(This is a temporary update — will be fully replaced in Phase B when the Navbar component is built.)

### 1.8 — Remove hero section decoration

In `web/src/app/page.tsx`, the right column (line 166-207):
- Remove the entire `md:col-span-5` content: outer glow ring, inner ring, BraceletLogo, vertical text
- Keep the grid column for negative space (editorial asymmetry)

### 1.9 — Update landing page footer with PulseraWordmark

In `web/src/app/page.tsx`, the footer (line 212-225):

**Current footer**:
```tsx
<span>Est. 2026</span>
<span>UGA Hacks</span>
```

**New footer**:
```tsx
<span>Est. 2026</span>
<PulseraWordmark size={14} color="#FFF1E6" className="opacity-20" />
<span>UGA Hacks</span>
```

The wordmark sits in the footer with the same muted opacity as the existing text, keeping the minimal aesthetic.

### 1.10 — Update dashboard header

In `web/src/app/dashboard/page.tsx`:
- Replace current BraceletLogo + text with `<PulseraLogo size={28} color="#2D2418" />`
(Temporary — will be replaced by Navbar in Phase B step 2.3.)

### 1.11 — Clean up

1. **Delete `web/src/components/BraceletLogo.tsx`** — fully replaced
2. **Remove Work Sans from Google Fonts import** in `page.tsx`:
   - Remove `family=Work+Sans:wght@400;500;600;700;800` from the URL
   - Keep Playfair Display and DM Sans (still in use)
3. **Remove all `BraceletLogo` imports** from page.tsx and dashboard/page.tsx
4. **Delete old `web/src/app/favicon.ico`** — replaced by `icon.svg`

### 1.12 — Visual QA and build verification (logo phase)

- `npm run build` must pass clean
- Visual comparison against `pulserareference.png`
- Test PulseraLogo on landing header and dashboard header
- Test PulseraWordmark in landing footer
- Test favicon in browser tab
- Check responsive
- No console errors, no font loading flash

---

### 2.1 — Create `Navbar.tsx` component

New file: `web/src/components/Navbar.tsx`

**Reference**: Eva AI centered floating navbar + Pulsera frosted glass texture.

**Structure**:
```tsx
interface NavbarProps {
  variant?: "dark" | "light";   // dark = landing page, light = dashboard
}
```

**Layout** (Eva AI structure):
```tsx
<nav>
  {/* Centered floating pill container */}
  <div className="mx-auto max-w-3xl mt-6 px-6 py-3 rounded-full flex items-center justify-between"
       style={{ /* frosted glass */ }}>

    {/* Left: Full logo (icon + wordmark) */}
    <PulseraLogo size={28} color={variant === "dark" ? "#FFF1E6" : "#2D2418"} />

    {/* Right: Nav links + CTA button */}
    <div className="flex items-center gap-6">
      <span>Features</span>       {/* text link — like Eva's "ES" */}
      <span>About</span>          {/* text link — like Eva's "Log in" */}
      <Link href="/dashboard"     {/* CTA — like Eva's "Agendar Demo →" */}
            className="rounded-full border px-5 py-2 text-sm font-semibold">
        Open Dashboard →
      </Link>
    </div>
  </div>
</nav>
```

**Nav links style** (Features, About):
- Font: DM Sans, same as current nav links
- Muted color: `#FFF1E6` at 50% opacity (dark variant) / `#2D2418` at 50% (light variant)
- Uppercase, small tracking, `text-sm font-medium tracking-wide`
- Hover: fade to full opacity, smooth transition
- These are plain text links (no background, no border) — matching Eva's "ES" and "Log in" style

**Frosted glass style** (from current "Care that connects" panel — `page.tsx` lines 86-95):

For **dark variant** (landing page):
```css
background: linear-gradient(135deg, rgba(20, 8, 6, 0.72) 0%, rgba(35, 12, 10, 0.58) 50%, rgba(20, 8, 6, 0.65) 100%)
backdrop-filter: blur(32px) saturate(1.4)
-webkit-backdrop-filter: blur(32px) saturate(1.4)
border: 1px solid rgba(255, 241, 230, 0.06)
box-shadow: 0 8px 64px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 241, 230, 0.04)
```

For **light variant** (dashboard):
```css
background: linear-gradient(135deg, rgba(250, 250, 247, 0.72) 0%, rgba(255, 255, 255, 0.58) 50%, rgba(250, 250, 247, 0.65) 100%)
backdrop-filter: blur(32px) saturate(1.4)
border: 1px solid rgba(45, 36, 24, 0.08)
box-shadow: 0 4px 32px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.5)
```

**CTA button** (Eva-style outlined):

For dark variant:
```css
border: 1px solid rgba(255, 241, 230, 0.2)
color: #FFF1E6
font-family: 'DM Sans', sans-serif
```
Hover: border brightens, subtle glow

For light variant:
```css
border: 1px solid rgba(45, 36, 24, 0.15)
color: #2D2418
```

**Animation**: Same staggered reveal as current header — `motion` fade-in from top.

**Responsive**:
- Desktop: `max-w-2xl`, comfortable spacing
- Mobile: Nearly full-width with small margins (`mx-4`), same pill shape

### 2.2 — Replace landing page header with Navbar

In `web/src/app/page.tsx`:
- Remove the entire `<motion.header>` block (lines 40-71)
- Replace with `<Navbar variant="dark" />`
- The Navbar is now a separate component, not inline

### 2.3 — Update dashboard to use Navbar

In `web/src/app/dashboard/page.tsx`:
- Remove current header
- Replace with `<Navbar variant="light" />`

### 2.4 — Visual QA and build verification (navbar phase)

- `npm run build` must pass clean
- Landing page: Centered frosted glass navbar with PulseraLogo + CTA
- Dashboard: Same layout with light variant colors
- Compare against Eva AI screenshot for structural similarity
- Check responsive: mobile pill adjusts, CTA still visible
- Frosted glass blur works over the dither background
- No console errors

### 3.1 — Ensure Dither mouse interaction works

**Problem**: The Dither component already has `enableMouseInteraction={true}` and `mouseRadius={1}` set in `page.tsx`. However, overlay elements (navbar, frosted glass panel, empty grid columns) sit on top of the Three.js canvas (`z-10`), which can block `pointer-events` from reaching the canvas.

**Current Dither config** (page.tsx):
```tsx
<Dither
  waveColor={[0.72, 0.11, 0.09]}
  waveSpeed={0.02}
  waveFrequency={2}
  waveAmplitude={0.3}
  colorNum={4}
  pixelSize={3}
  enableMouseInteraction={true}
  mouseRadius={1}
/>
```

**Fix**: Add `pointer-events: none` to all non-interactive overlay elements so mouse events pass through to the Dither canvas beneath:

1. **Frosted glass panel** (the "Care that connects" backdrop) — `pointer-events-none` on the backdrop div, `pointer-events-auto` only on the interactive content inside (buttons, links)
2. **Navbar** — `pointer-events-auto` on the navbar pill itself (it's interactive), but the surrounding space should NOT block events
3. **Empty hero right column** — `pointer-events-none` (it's just whitespace)
4. **Footer** — `pointer-events-auto` only on clickable elements

**Key principle**: Only interactive elements (buttons, links, navbar pill) capture pointer events. Everything else passes through to the Dither canvas.

**CSS approach**:
```tsx
{/* Main overlay container */}
<div className="relative z-10 min-h-screen pointer-events-none">
  {/* Navbar gets pointer-events back */}
  <Navbar className="pointer-events-auto" variant="dark" />

  {/* Content area — only interactive children get pointer-events */}
  <main className="pointer-events-none">
    {/* Frosted panel backdrop — no pointer events */}
    <div style={{ pointerEvents: "none" }}>{/* frosted glass */}</div>
    {/* Buttons and links inside — pointer-events-auto */}
    <div className="pointer-events-auto">{/* CTA button, text */}</div>
  </main>
</div>
```

### 3.2 — Visual QA: Dither interactivity

- Move mouse across the entire landing page — dither waves should visibly distort/react within `mouseRadius={1}` around the cursor
- Verify interaction works in areas:
  - Empty background areas (should work)
  - Over the frosted glass panel text area (should work — panel is pointer-events-none, only links/buttons capture)
  - Near the navbar (should work in surrounding space, not inside the pill itself)
- Verify interactive elements still work:
  - Navbar CTA button is clickable
  - Nav links (Features, About) are clickable
  - Footer links are clickable
- Test on mobile: touch interaction with the dither (if supported by the component)

---

## Tests

No automated visual tests in the project. QA is manual:
- `npm run build` passes
- All three logo variants render correctly
- Favicon shows two rings in browser tab
- Navbar is centered and frosted glass works over dither background
- CTA button is clickable and links to /dashboard
- **Dither mouse interaction works** — waves visibly distort when hovering anywhere on the landing page
- No FOUT — `next/font/local` with `display: swap` handles this
- Color adapts correctly between dark/light contexts
- Responsive at all breakpoints

---

## Notes & Decisions

### Decision: Three logo variants (Icon / Wordmark / Full)
**Chosen**: Create three separate components instead of one monolithic logo. Allows flexible use: icon alone for favicon/compact spaces, wordmark for footer/minimal contexts, full logo for primary branding.

### Decision: Recreate reference as SVG + HTML text (not embed PNG)
**Chosen**: The `pulserareference.png` is low quality and not scalable. We recreate using `bracelet.svg` path data + Garet Heavy via `next/font/local`. Resolution-independent and color-adaptable.

### Decision: Hybrid SVG icon + HTML text (not pure SVG)
**Chosen**: Rings as inline SVG, text as HTML `<span>` with CSS font. Leverages `next/font/local` for automatic optimization.

### Decision: SVG favicon via Next.js App Router convention
**Chosen**: Use `web/src/app/icon.svg`. Vector-based, no pixelation, simplest approach.

### Decision: next/font/local over @font-face in CSS
**Chosen**: Automatic optimization, preloading, zero layout shift, CSS variable injection.

### Decision: Hero section right column
**Chosen**: Remove decorative content, keep grid column for negative space.

### Decision: Footer wordmark style
**Chosen**: Same muted opacity as existing footer text (`opacity-20`).

### Decision: Eva AI navbar structure
**Chosen**: Centered floating pill with frosted glass. Reuses the SAME frosted glass texture already on the "Care that connects" panel — maintains visual consistency. Layout mirrors Eva AI exactly: logo on the left, nav links (Features, About) + CTA button ("Open Dashboard →") on the right. "Contact" link removed — only Features and About remain.

### Decision: Navbar as reusable component with variants
**Chosen**: Single `Navbar.tsx` with `variant` prop ("dark" / "light"). Used on both landing page and dashboard, adapting colors to context. Avoids duplicating navbar code.

### Rejected: Using Garet via CDN
Garet is not on Google Fonts or any common CDN. Self-hosting is the only option.

### Rejected: Converting text to SVG paths
Loses editability, accessibility, adds maintenance cost.

### Rejected: Generating .ico with ImageMagick/sharp
Over-engineered. SVG favicon is supported by all modern browsers.

### Rejected: Removing all nav links
Initially considered removing all links. User clarified: keep "Features" and "About" as text links (like Eva's "ES" and "Log in"), only "Contact" is removed. CTA stays as "Open Dashboard →".
