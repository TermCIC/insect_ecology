# Biocontrol Farm visual update

Updated `biocontrol_farm_game.html` with a warm garden-diorama palette, scalloped cabbage leaves, branching tomato foliage, petalled flower strips, layered orchard crowns, timber borders, a fence, stepping stones and instanced meadow grass. Evergreen notebook panels, brass accents, grouped tool borders and responsive HUD positioning connect the interface to the farm.

Architecture: ecology, prices, progression and IPM equations remain in the existing simulation block. Changes are confined to visual construction, resource disposal, rendering, camera composition, CSS, and query-gated diagnostics. Decorative randomness now has a separate RNG. Plant details merge by material; fruit visibility still follows crop development. Rebuilding a plant disposes its merged geometries and owned materials. Existing raycast tile proxies remain unchanged.

## Verification

Command: `node tests/biocontrol_visual_qa.mjs after`

- Chrome desktop 1440×900, laptop 1024×768, phone emulation 390×844.
- Real mouse drag from the cabbage tool to a projected tile successfully plants a crop.
- Representative 36-tile farm: flowers, banks, cabbage, tomato, maturity and damaged foliage, plus a trap.
- Start menu, populated farm, phone threshold overlay and scrollable phone guide captured.
- No captured console or runtime errors; no phone document overflow; desktop HUD does not overlap the inspector.
- Phone tools measure 48.56×52 CSS pixels.
- Canvas sampling detects 45 distinct colors across 121 samples.
- Representative desktop: 246 draw calls, 258,534 triangles, 142 geometries, 2 textures, DPR 1; one shadow-casting light, no postprocessing passes.
- `git diff --check` passed.

Screenshots: `after-menu.png`, `after-desktop.png`, `after-laptop.png`, `after-mobile.png`, `after-threshold-mobile.png`, `after-guide-mobile.png`. Machine-readable evidence: `after-report.json`.

Limits: software-rendered Chrome emulation is not a physical-phone performance test. Draw calls exceed the skill's conservative 150-call mobile starting budget; full-field low-end-device profiling remains advisable. No FPS or comparative performance improvement is claimed. The first sandboxed browser attempts timed out before rendering; the successful run required an approved unsandboxed Chrome process. No before-image baseline was obtained. Screenshot regression comparisons are deferred because simulation and insect animation are stochastic; the repeatable capture script and interaction/pixel smoke checks are included instead. No deployment was performed.

## Skill and source record

Loaded skills from `C:/Users/ASUS/.codex/skills/`: `pre-change-architecture-review`, `threejs-game-director`, `threejs-aaa-graphics-builder`, `threejs-game-ui-designer`, `threejs-qa-release`.

Read references: director `phase-playbook`; graphics `implementation-blueprint`, `model-recipes`, `render-recipes`, `technical-art`, `visual-scorecard`, and procedural-model/material-lighting/performance-safe-detail checklists; UI `ui-patterns` and game-ui/hud-readability/responsive-fit checklists; QA `qa-release-checklists` and visual-verification/playtest checklists.

Scope: a focused visual revision of an existing game, without a premium/AAA or release-readiness claim. Repeated plants and supporting scenery use local shared procedural geometry; no external image/model/audio generation or new asset service dependency. Gameplay, level design and audio phases are outside this revision. Graphics/UI implementation and focused browser verification completed; release deployment and long-running difficulty bot testing are outside scope.

Skill guidance influenced material roles, preserving tile picking, shared geometry, merging repeated details, disposal, responsive controls and measured browser verification.
