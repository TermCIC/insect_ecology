# Functional Response Teaching Game: Design Notes

## Purpose

This document captures the reusable design of `functional_response_game.html`: a browser-based ecology activity in which students act as a mantis predator, capture caterpillar prey, process each prey, and use repeated trials to construct a functional-response curve.

The central teaching idea is that a predator's intake rate is not determined only by prey availability. Searching, encounters, capture success, and handling time all affect the response.

## Learning objectives

By the end of one activity, students should be able to:

1. Describe the relationship between prey density and predator capture rate.
2. Explain the meanings of attack rate (`a`) and handling time (`T_h`).
3. Recognize the saturating form of a Holling Type II functional response.
4. Collect data from repeated standardized trials rather than relying on one observation.
5. Interpret variation between an observed data point and a fitted model.

## Core learning loop

```text
Choose student ID
      ↓
Complete a 60-second hunt
      ↓
Find and capture prey
      ↓
Complete prey-processing task
      ↓
Record capture rate, attack rate, and handling time
      ↓
Repeat at lower prey density (five trials)
      ↓
Fit a functional-response curve and export a result image
```

The loop deliberately makes handling visible. A prey is not counted as immediately usable food: after capture, the student must process anatomy parts before continuing.

## Experimental structure

The current practical consists of five 60-second trials (five minutes total).

| Trial | Initial prey density | Forest density | Prey movement speed |
|---:|---:|---:|---:|
| 1 | 400 | 420 trees | 0.70 |
| 2 | 200 | 420 trees | 0.64 |
| 3 | 100 | 420 trees | 0.58 |
| 4 | 50 | 420 trees | 0.52 |
| 5 | 25 | 420 trees | 0.46 |

The prey-density sequence halves each round. Tree density stays high so habitat structure remains a meaningful search constraint while prey density is the main experimental variable.

### Why fixed-duration trials?

Using the same duration for every trial lets students compare intake rates directly:

`observed capture rate = prey captured / 60 seconds`

This is more interpretable than comparing raw capture totals from trials of unequal duration.

## Ecological model

The displayed theoretical model is the Holling Type II disc equation:

`N_e = a N T / (1 + a T_h N)`

For a rate-based graph, this becomes:

`capture rate = a N / (1 + a T_h N)`

Where:

- `N`: initial prey density.
- `a`: attack rate; estimated from prey encounters during hunting.
- `T_h`: handling time per prey; estimated from the processing mini-game.
- `N_e`: number of prey eaten over a period `T`.

The final graph uses the five observed trial rates and fits a Holling Type II curve by nonlinear least squares. The exported graph includes fitted `a`, fitted `T_h`, and `R²`.

## Game systems

### 1. Spherical forest world

The game world is a planet rather than a finite rectangular map. The player remains aligned to the local surface normal, allowing continuous exploration without visible map borders.

Trees and prey use an even spherical (Fibonacci) distribution. This is important: unconstrained random placement creates local clusters, which can artificially inflate encounter frequency and make the high-density trial reach saturation too quickly.

Reusable principle: when density is the independent variable, control spatial distribution so the experiment does not accidentally test clustering instead.

### 2. Predator controls

- Desktop: mouse look, WASD movement, click/Space capture.
- Phone/tablet: drag to look, virtual joystick to move, CATCH button to capture.

The joystick must reset on `pointerup` and `pointercancel`, including releases outside the joystick. This is a reusable mobile-control requirement for any touch game.

### 3. Prey behaviour

Each caterpillar has:

- A segmented body and articulated legs.
- A tangential random walking direction on the planet surface.
- Occasional random turns.
- A short flee/push response when the predator approaches.

The behaviour is intentionally simple. Its role is to create search and capture variation, not to simulate a full caterpillar behavioural ecology model.

### 4. Capture and processing

Capture requires a caterpillar at the centre crosshair and within a short distance. On capture, the student enters a processing activity.

The processing activity asks the student to drag these parts to matching slots:

- Antenna
- Head
- Thorax
- Abdomen
- Foreleg
- Mid leg
- Hind leg

The elapsed completion time contributes to the live handling-time estimate. This turns `T_h` from an abstract parameter into an action students experience.

## Data recorded per trial

Each 60-second trial stores:

- Initial prey density.
- Number captured.
- Observed capture rate.
- Live attack-rate estimate.
- Live handling-time estimate.

At the end of the fifth trial, the game additionally reports:

- Total prey captured.
- Total hunting duration (300 seconds).
- Mean capture rate.
- Fitted Type II `a`.
- Fitted Type II `T_h`.
- Fit `R²`.
- Capture totals for Trials 1–5.

These details are rendered inside the chart canvas so that the downloaded PNG is a complete evidence record.

## Assessment and debrief prompts

Suggested discussion questions:

1. Did your capture rate increase with prey density? Where did it begin to level off?
2. Which part of the game represents handling time?
3. Why might two students obtain different curves under the same density sequence?
4. Does a low `R²` necessarily mean the game failed, or can it show behavioural variability and limited sample size?
5. How would more trials, longer trials, or a more controlled search area change the curve?
6. What would a Type I or Type III response look like compared with this result?

## Practical design lessons

### Use an explicit end state

The five-trial sequence ends automatically. This avoids students ending early and producing a curve with too few points.

### Treat mobile layout as part of the game design

The start screen, HUD, processing overlay, results screen, and download control all need separate phone layouts. Important rules:

- Do not rely on browser `vh` alone; use `dvh` where possible.
- Make long overlays scrollable.
- Keep action buttons reachable above browser controls.
- Use larger touch targets than desktop targets.
- Avoid dense four-column statistics panels on narrow screens.

### Separate model prediction from fitted result

During play, live values help students see the model respond. At the end, fit the curve to the five observed trial outcomes instead of merely averaging live parameters. These answer different questions:

- Live model: “What does the current theory predict?”
- Final fit: “What parameter values best describe this student's five observations?”

## Reusable template for future ecology games

The same architecture can support other teaching games.

| Component | Reusable pattern | Example replacement |
|---|---|---|
| Player role | Embodied organism with a simple goal | Pollinator, parasitoid, herbivore, scavenger |
| World | 3D habitat with controlled resource distribution | Field, stream, crop canopy, soil patch |
| Repeated trial | Fixed time or fixed effort | Quadrat sample, trap night, foraging bout |
| Meaningful cost | Short task that represents a biological constraint | Egg laying, prey handling, pollen packing |
| Experimental factor | Change one major variable each round | Temperature, host density, patch quality |
| Output | Student-specific graph and PNG | Growth curve, survivorship curve, dose-response curve |

## Possible future extensions

1. Add a pre-lab prediction graph that students compare with their final curve.
2. Add replicate runs per density and report mean ± variation.
3. Add a teacher export format such as CSV or a class code.
4. Add a controlled “laboratory mode” with stationary prey to reduce behavioural noise.
5. Add competing prey types with different handling times.
6. Add a Type III scenario where attack probability increases at intermediate prey density.
7. Add accessibility options: reduced motion, larger text, and an alternative tap-to-place processing mode.

## Success criteria

The activity is successful when students can complete it on both desktop and mobile, produce five standardized observations, export a readable evidence image, and explain why the final curve tends to saturate rather than increase indefinitely.
