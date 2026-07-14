# Garden Ant Rivalry — implementation and QA report

## Game design brief

The player directly controls one black worker ant across two connected spaces: a spherical garden surface and a horizontally scrolling underground nest. The teaching goal is to make colony competition legible through individual decisions: locate food, carry it through the burrow, deliver it to the black chamber, excavate useful routes, and respond to red-ant interference.

## Core loop

1. Explore the spherical garden and collect one food item.
2. Find the burrow and enter while carrying the item.
3. Navigate the underground tunnel and deliver food to the black chamber.
4. Dig adjacent soil when a route or resource requires excavation.
5. Avoid or displace red ants, then repeat until the three-minute trial ends.

Food collected on the surface does not score immediately. A black-colony point is awarded only after an underground chamber delivery, so the complete ecological task is required. The final report compares colony food, underground deliveries, excavation, travel, health, attacks, and rivals displaced.

## Level/encounter plan

- Surface: a continuous spherical garden with distributed trees, food, black burrow entrance, and red nest.
- Underground: a 72 × 12 cell side-scrolling field, including an entrance corridor, black chamber, excavatable soil, underground food, and five patrolling red ants.
- Escalation: safe early delivery teaches the route; deeper food and red patrols require excavation and risk decisions.

## Skill-loading ledger

- `pre-change-architecture-review`: mapped scene construction, state/reset flow, input, rendering, reporting, and QA surfaces before edits.
- `threejs-game-director`: coordinated implementation and verification gates.
- `threejs-gameplay-systems`: reviewed the teaching loop, scoring contract, encounters, feedback, and deterministic hooks.
- `threejs-aaa-graphics-builder`: used for lighting, contrast, and render-budget review; no premium/AAA claim is made.
- `threejs-game-ui-designer`: checked mobile safe layout, minimum touch targets, HUD, controls, and result actions.
- `threejs-debug-profiler`: guided InstancedMesh, renderer diagnostics, mobile camera, input release, and pixel sampling.
- `threejs-qa-release`: guided deterministic states, screenshots, mobile emulation, canvas validation, and release evidence.

## Reference ledger

- Game director phase playbook: used to order architecture, gameplay, visuals/UI, diagnostics, and QA.
- Gameplay systems references: core-loop contract, deterministic test hooks, state transitions, and encounter checks.
- AAA graphics references: technical art budgets, lighting hierarchy, material reuse, and visual readability.
- UI references: 44 px minimum touch target, mobile viewport containment, result-button reachability.
- Debug/profile references: renderer counters, InstancedMesh verification, canvas pixel sampling, resize and input lifecycle.
- QA/release references: desktop/mobile screenshots, automated interaction checks, console/page-error gates, and artifact report.

No external assets were required for this focused systems pass. Existing procedural Three.js geometry and UI were retained; 3D, image, and audio generators were therefore outside scope.

## Phase ledger

### Gameplay systems

- Changed scoring so surface pickup creates a carried item, while only underground chamber delivery increases black-colony food.
- Added explicit `surfaceCollected` and `undergroundDelivered` counters to state, diagnostics, and the final performance report.
- Added visible attack feedback and hit/miss messaging.
- Made reset reconstruct the grid from an immutable base grid and restore all red-ant starting positions/directions.

### AAA graphics

- Replaced 864 underground soil meshes with one colorized `THREE.InstancedMesh`.
- Rebalanced underground background, soil colors, emissive contribution, ambient/key lighting, and a worker-following point light.
- Increased underground worker separation from the tunnel background without changing the black-colony identity.

### UI

- Mobile directional buttons are 48 × 48 px; action controls remain fully inside a 390 × 844 viewport.
- The mobile spherical camera increases distance and lift in portrait orientation.
- Underground state changes snap the side-scrolling camera to the worker once, then resume smooth following.
- Result report, Download PNG, and Play again controls remain reachable on mobile.

### Debug/profile

- Added `window.__THREE_GAME_DIAGNOSTICS__` with render calls, triangles, geometries, textures, materials, DPR, shadows, frame time, state, and entity counts.
- Added deterministic `window.__THREE_GAME_TEST_HOOKS__` for scene states, pickup, entry, delivery, digging, combat, reset, result, input pause, and canvas sampling.
- Added blur/visibility input release to prevent stuck mobile controls.
- Added CDN failure retry behavior.

### QA/release

- Added `tests/garden_ant_qa.mjs`, a dependency-free Chrome DevTools Protocol runner.
- Automated login, start, pickup, burrow entry, delivery, digging, reset, combat, timeout/result, replay, mobile movement/release, layout, PNG reachability, renderer budgets, screenshots, pixel variation, console errors, and page errors.
- Added CDP timeouts and browser stderr diagnostics so browser-launch failures are actionable.

## Verification evidence

Final automated run: **29 passed, 0 failed**.

| Evidence | Result |
| --- | --- |
| Inline game JavaScript syntax | Passed |
| QA runner syntax | Passed |
| `git diff --check` | Passed |
| Core teaching loop | Pickup → enter nest → chamber delivery passed |
| Reset | Dug cell 14,3 returned to solid passed |
| Instancing | 864 cells, 1 InstancedMesh draw object |
| Desktop surface | 60 calls, 7,856 triangles |
| Underground | 17 calls, 11,556 triangles |
| Underground canvas pixels | variance 122, 10 sampled colors |
| Mobile target | 48 × 48 px |
| Mobile controls | Inside 390 × 844 viewport; release passed |
| Result export | Download PNG visible and reachable |
| Console/page errors | 0 / 0 |

The software-WebGL QA command must run outside the filesystem sandbox because Chromium's GPU subprocess writes its own temporary shader/cache files:

```powershell
node tests\garden_ant_qa.mjs
```

## Technical art render budget

The scene stays below the starting mobile limit of 150 calls: 60 calls on the surface and 17 underground. Geometry memory reports 9 geometries, one texture, and 14 cached materials. The soil field is a single instanced draw object, preventing reset-time mesh/material churn.

## Visual test harness

Deterministic hooks create active surface, underground, and result states at desktop and phone sizes. Six screenshots and the machine-readable report are stored in `artifacts/garden-ant-qa/`. Canvas readback confirms nonblank, varied rendering; manual fresh-eyes inspection confirms that the worker, tunnel grid, HUD, touch controls, report, and PNG button are visible.

## Remaining release note

Three.js is loaded from a CDN, so the first load still requires network access. The page now provides a reload path if that dependency fails.
