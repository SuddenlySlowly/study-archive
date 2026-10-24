# Palantir-style design spec for Suddenly Universe (hand-off)

Sources fetched 2026-10-24:
- [W] palantir.com homepage + its CSS: https://www.palantir.com/ , https://www.palantir.com/_next/static/css/{0bb5a1be7a9ac24e,567b6efa152398f0,1ed43d94fcc44917}.css
- [BP] Blueprint colors: https://unpkg.com/@blueprintjs/colors/lib/esm/colors.js ; Blueprint core CSS: https://unpkg.com/@blueprintjs/core/lib/css/blueprint.css ; https://blueprintjs.com/docs/#core/colors
- Investor/AIPCon slides were not fetched (PDFs/images), so slide-specific claims below are marked *observed convention, unverified*.

## 1. Color
Marketing site [W]
- Ink / main text & dark bg: `#1E2124`; medium `#2F3234`; light body `#494A4B`; muted `#636363`, `#767676`
- Light surfaces: `#FFFFFF`, `#F9F9F9`, `#F3F3F3`; dark-theme text `#E5E5E5`
- Accent is one color per page/theme (`--accent-color`): forest `#2B5945` (with tint `#F4F7F6`), blue `#4E8AF7`, khaki `#8C7847`, mint `#A6F2CC` (on dark), blush `#F2C4BF`. Accents are also used at 5% and 10% alpha for washes.
- Error `#FF4136`. Other palette colors in the CSS: `#D1980B #D17E09 #D13913 #9F1239 #728C23 #634DBF #A7B6C2`.
Product UI / data (Blueprint) [BP]
- Dark: `#111418` black, `#1C2127`, `#252A31`, `#2F343C`, `#383E47`, `#404854`
- Grays: `#5F6B7C #738091 #8F99A8 #ABB3BF #C5CBD3`
- Light: `#D3D8DE #DCE0E5 #E5E8EB #EDEFF2 #F6F7F9`
- Intents: primary `#2D72D2`, success `#238551`, warning `#C87619`, danger `#CD4246`
- Chart series (use the "3" shades): `#2D72D2` blue, `#147EB3` cerulean, `#238551` green, `#29A634` forest, `#8EB125` lime, `#D1980B` gold, `#C87619` orange, `#7961DB` indigo, `#CD4246` red.
Usage: mostly black/white plus gray, with one accent per page. Save intent colors for meaning (status, error). Dark mode uses the Blueprint dark-gray steps for its layers.

## 2. Typography
- Palantir uses **Alliance No.1 / No.2** (commercial), with a system-ui fallback stack [W]. Free stand-ins: Inter, or Neue Haas–like options such as "Inter Tight". For Korean, use Pretendard.
- Blueprint UI uses the system stack (-apple-system, "Segoe UI", Roboto…) at a 14px base [BP].
- The scale is in rem (18px root implied by the 0.888rem steps). Headline sizes are 1.89 / 2.22 / 2.78rem at weight 400 with letter-spacing **-0.02em** [W]. The site doesn't use bold display type: weights are mostly 400, with 700/600 rarely.
- Captions/"earmark" labels are 0.556rem with **0.05em** tracking, and one label style uses 0.1em uppercase [W]. Use this for small all-caps metadata.
- Monospace for IDs, timestamps and numbers is a docs/product convention (Blueprint `.bp-monospace-text`) [BP]. Suggested: JetBrains Mono / IBM Plex Mono.

## 3. Layout
- Corner radius: the site is mostly **0** (square), with 4px and 2px (.111rem) in a few places [W]. Blueprint uses 2–4px [BP]. Rule: square panels, at most 2–4px on controls.
- Borders are 1px hairlines in currentColor or a light gray (`#DCE0E5` light, `#383E47` dark). Use dividers rather than shadows.
- Grid (suggested, not sourced): 4px spacing unit, generous whitespace, left-aligned 12-column content. Blueprint CSS sizes text at 12/14/16/20px [BP].
- Panels are flat rectangles with a header row: an uppercase label on the left, metadata on the right.

## 4. Motifs
- High black/white contrast, large thin headlines, lots of negative space [W].
- Thin rules, small uppercase tracked labels, numbered sections (01 / 02) — *observed convention, unverified for slides*.
- Data-viz: flat fills, no gradients or 3D, gridlines on a gray scale, a single highlighted series in the accent color and the rest gray, numbers right-aligned in mono.
- Graphs and lineage diagrams: rectangular nodes, orthogonal or straight 1px connectors, status dots in intent colors (*observed convention, Foundry docs page not fetched*).
- Icons: Blueprint icons, 16/20px single-weight line glyphs [BP].

## 5. Motion
- Short and functional. Durations are 0.1–0.25s with `cubic-bezier(.645,.045,.355,1)` or ease-in-out, on transform and opacity [W]. The site also has a gray "wipe" reveal (`--gray-wipe-x:-110%`) [W]. No bouncing, no long orbits.

## 6. Do / Don't
Do: neutral base + one accent; hairline dividers; square corners; uppercase tracked labels; mono numbers; dense but aligned data panels; dark mode on `#111418`/`#1C2127`.
Don't: gradients, glows, drop shadows, rounded pill cards, emoji as UI, more than one accent per view, saturated rainbow charts, playful easing.

## Applying it to Suddenly Universe
Keep the planet concept, but render it as a schematic: flat circles on `#111418`, 1px orbit lines in `#383E47`, labels set as `01 — STUDY` in uppercase mono, a single accent (`#2D72D2` or `#A6F2CC`), and a slow, linear rotation or none at all.
