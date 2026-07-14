# Ant Colony Teaching Game: Design Notes

## Purpose

This document proposes an original, classroom-ready ant colony simulation inspired by the broad appeal of classic ant-colony games such as *SimAnt*: students guide a colony through foraging, nest construction, brood care, defence, and seasonal change.

The game should not copy any existing game’s assets, story, interface, or exact rules. Its purpose is to make colony ecology, collective behaviour, and trade-offs observable through play.

## Teaching premise

Students are the colony’s “collective intelligence,” not a single all-powerful ant. They set priorities, place pheromone trails, and make high-level decisions; individual ants follow simple local rules.

The key lesson is emergence:

> Complex colony outcomes arise from many simple ants responding to local information, resource conditions, and colony needs.

## Learning objectives

By the end of the activity, students should be able to:

1. Explain division of labour among queen, workers, brood, and defenders.
2. Describe how pheromone trails help a colony exploit food efficiently.
3. Identify trade-offs between foraging, brood care, nest expansion, and defence.
4. Relate resource availability and temperature to colony growth and survival.
5. Interpret colony-level metrics such as worker population, food stores, brood survival, and territory.
6. Recognize that collective behaviour can emerge without every individual receiving central instructions.

## Core learning loop

```text
Observe colony needs
      ↓
Set one or two priorities / place a pheromone trail
      ↓
Worker ants respond using local rules
      ↓
Food, brood, nest, and threat metrics change
      ↓
Respond to a new ecological challenge
      ↓
Review colony outcome and explain the trade-off
```

The player should make meaningful choices every 20–60 seconds, while the colony simulation runs continuously between decisions.

## Recommended game format

### View and controls

- **Primary view:** 2D top-down cross-section with surface habitat and underground nest visible together.
- **Optional close-up:** tap an ant, food item, or chamber to open a simple information panel.
- **Desktop:** mouse placement, drag-to-draw pheromone trails, keyboard pause/speed controls.
- **Mobile:** tap to select a task, drag to draw a trail, large bottom action buttons.

This view is more practical than first-person movement for a colony game because students need to observe relationships among many ants and chambers simultaneously.

### Time structure

Use a short scenario format rather than an endless sandbox:

| Phase | Duration | Teaching focus |
|---|---:|---|
| Establish | 2 minutes | Queen, workers, basic food and brood care |
| Growth | 3 minutes | Pheromone trails, division of labour, nest expansion |
| Disturbance | 2 minutes | Rain, predator, competition, pesticide, or heat |
| Reflection | 1 minute | Read metrics and explain trade-offs |

One complete class run lasts about eight minutes. A teacher can repeat the scenario with a changed environmental condition.

## Colony agents

### Queen

- Produces eggs when food and nest conditions are sufficient.
- Does not leave the central chamber.
- Colony failure occurs if the queen dies.

### Worker ants

Each worker uses a small state machine:

```text
Idle → choose task → travel → perform task → return / reassess
```

Possible tasks:

- Forage for food.
- Follow or reinforce a pheromone trail.
- Care for eggs, larvae, or pupae.
- Excavate a nest chamber.
- Defend the nest entrance.
- Remove waste or dead brood.

Workers should choose tasks from colony need, local stimuli, and pheromone strength—not from direct micromanagement.

### Brood

- Egg → larva → pupa → adult worker.
- Development depends on food, temperature, and care.
- Brood survival is a visible indicator of colony health.

### Threats and competitors

Start with one threat per scenario:

- Spider near the trail.
- Rival ant colony competing for food.
- Flooded tunnel after rainfall.
- Pesticide-contaminated bait.
- Heat/drought reducing foraging time.

Avoid combining every threat in the first version. A simple, legible cause-and-effect relationship is more educational.

## Core simulation systems

### 1. Pheromone field

Represent pheromone as a low-resolution grid with one or more channels:

- Food trail pheromone.
- Alarm pheromone.
- Home/nest cue.

Each simulation tick:

1. Ants deposit pheromone according to their state.
2. Pheromone diffuses slightly to neighbouring cells.
3. Pheromone evaporates over time.
4. Searching ants sample nearby cells and bias movement toward useful signals.

This produces self-organizing trails without pathfinding every ant directly to the food.

### 2. Resource budget

Track food as colony energy units:

```text
food store
  + food returned by foragers
  - worker maintenance
  - brood development
  - defence / recovery costs
```

Food shortage should first slow brood growth, then reduce worker performance, then increase mortality. This makes resource limitation more meaningful than an immediate game-over state.

### 3. Task allocation

Show a simple colony priority control with four task categories:

- Food
- Brood
- Nest
- Defence

The player sets priorities, for example `Food: high` during shortage. Workers still decide locally; the priority modifies the probability of choosing each task.

This preserves the ecology concept while giving students agency.

### 4. Nest construction

The player marks excavation zones. Workers excavate cells gradually.

Chamber types:

- Nursery: raises brood survival.
- Food store: reduces food spoilage.
- Waste chamber: lowers disease risk.
- Entrance/defence chamber: improves response to intruders.

Construction costs worker time. It should therefore compete directly with foraging and brood care.

## Player decisions and consequences

| Decision | Short-term benefit | Cost or risk |
|---|---|---|
| Draw a strong food trail | Faster food exploitation | More workers exposed above ground |
| Raise defence priority | Faster response to threats | Less food and brood care |
| Excavate a nursery | Better future brood survival | Immediate labour and energy cost |
| Send workers to a distant resource | Larger food reward | Longer travel and greater predation risk |
| Close a tunnel after rain | Protects colony core | Can isolate food or workers |

Every action should teach a trade-off, not simply provide an upgrade.

## Scenarios

### Scenario 1: First Trail

Students locate two food patches and compare a short, small resource with a distant, large resource. They learn pheromone reinforcement and travel-cost trade-offs.

### Scenario 2: Hungry Brood

Larvae are developing quickly, but food stores are low. Students decide whether to allocate workers to foraging or brood care.

### Scenario 3: Rainy Day

Surface foraging is reduced and one tunnel floods. Students learn nest architecture and response to environmental disturbance.

### Scenario 4: Rival Colony

Two colonies compete for patches. Students observe interference competition and territory dynamics.

### Scenario 5: Pesticide Choice

One food source is contaminated. Students must identify the short-term reward and long-term colony cost.

## Metrics and student output

The HUD should remain compact and use mobile-friendly two-column layout.

Suggested live metrics:

- Worker population.
- Brood survival rate.
- Food store.
- Active foragers.
- Pheromone-trail efficiency.
- Nest temperature/humidity.
- Threat level.

At scenario end, provide a report card with:

- Student ID and scenario name.
- Final colony population.
- Food collected and food remaining.
- Brood survival percentage.
- Mean foraging-trip duration.
- Mean trail efficiency: food returned per foraging worker.
- Time spent in each task category.
- A timeline chart of food stores and worker population.
- One evidence-backed reflection prompt.

Export the result as a PNG, including every value needed for assessment.

## Assessment prompts

1. Which colony priority did you change most often, and why?
2. Did the strongest pheromone trail always produce the best outcome?
3. What evidence shows a trade-off between food collection and brood care?
4. Which event had the greatest effect on colony growth?
5. If you ran the scenario again, what would you change first?

## Technical architecture

```text
Scenario configuration
      ↓
Grid world + nest cells + resource cells
      ↓
Pheromone fields and environmental conditions
      ↓
Ant state machines and local movement rules
      ↓
Colony resource / brood / population model
      ↓
HUD, event log, results chart, PNG export
```

Recommended implementation approach:

- Render with Canvas 2D or Three.js orthographic camera.
- Use a fixed simulation timestep separate from rendering.
- Use a spatial grid for pheromones, resources, and nearby-ant queries.
- Start with 50–150 visible ants for mobile performance.
- Aggregate distant ants or use instancing if the colony grows larger.
- Keep the simulation deterministic by accepting a scenario seed; this makes classes comparable.

## Mobile design requirements

- Priorities must be large tap targets, never dense desktop sliders.
- The result overlay must scroll internally and keep the PNG button reachable.
- Use `dvh` for safe full-height overlays.
- Reset all touch controls on `pointerup` and `pointercancel`.
- Do not place essential HUD content behind browser chrome.

## Minimal viable version

Build in this order:

1. Top-down grid world, nest entrance, food patches, 30 worker ants.
2. Worker states: search, collect, return, idle.
3. Food pheromone deposition, diffusion, and evaporation.
4. Food store plus brood-growth indicator.
5. Priority controls for food/brood/defence.
6. One disturbance scenario and end-of-scenario report.
7. Student ID and PNG export.

Only after this works should the game add rival colonies, excavation, specialised castes, or advanced weather.

## Success criteria

The game succeeds when students can see a colony-level pattern emerge from individual worker actions, explain at least one ecological trade-off they made, and export a result that documents their decisions and colony outcome.

## Reference inspiration

The historical inspiration is *SimAnt*, a 1991 colony-simulation game centered on managing an ant colony. This design retains the broad colony-simulation appeal while using original mechanics, interface, learning outcomes, and classroom assessment.
