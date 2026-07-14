# Battery Workout (Test) by Lutarym

Standalone Home Assistant Lovelace card — an animated cartoon battery
that lifts a barbell overhead, blinks, and wobbles. Built as an isolated
test bed for a single character animation before it gets composed into
the larger [`lutarym-pv-card`](https://github.com/Lutarym/lutarym-pv-card)
power flow diagram. No surrounding circle — the character floats freely
on the card background.

## Entities

| Field | Entity | Convention |
|---|---|---|
| `entity_discharge_power` | Entladeleistung | always ≥ 0 (W or kW) |
| `entity_charge_power` | Ladeleistung | always ≥ 0 (W or kW) |
| `entity_soc` | Ladezustand | % |

All three are optional and independent (unlike a single signed power
sensor) — feed whichever your battery integration exposes. Animation
speed scales with whichever of discharge/charge is currently higher,
relative to `max_watt`.

## Character selection

The `character` dropdown in the visual editor picks between:

- **`battery`** (default) — the weightlifting battery with its four SOC-driven moods (see below)
- **`sun`** — the sun character extracted 1:1 from
  [`lutarym-pv-mood-card`](https://github.com/Lutarym/lutarym-pv-mood-card)'s
  "happy" state: rotating ray rings, pulsing corona, solar flares, and a
  blinking face. Shown permanently in full glory here — this test card
  has no PV entity to drive mood staging (that logic stays in the mood
  card itself).

## Mood state (SOC-driven, battery character only)

Four states, auto-derived from `entity_soc` against three thresholds
(`threshold_empty_pct` default 15, `threshold_weak_pct` default 40,
`threshold_full_pct` default 90):

| State | SOC range (defaults) | Character |
|---|---|---|
| `empty` | ≤ 15% | Exhausted — arms hang limp, tired droopy eyes, one sweat drop |
| `weak` | 15–40% | Out of breath — panting mouth, two sweat drops, shaky weak lift attempt |
| `normal` | 40–90% | Focused — lifts the barbell overhead (the original animation) |
| `full` | > 90% | Content — round belly, satisfied closed-eye smile, arms resting, does nothing |

Without `entity_soc` configured, the `mood_state` dropdown in the visual
editor acts as a fixed manual override — useful for previewing a state.

## Installation via HACS

1. HACS → Frontend → **⋮** → Custom repositories
2. Enter this repository's URL, category **Dashboard**
3. Install "Battery Workout (Test) by Lutarym"
4. Reload Home Assistant (clear browser cache if needed)

## Manual installation

Copy `lutarym-battery-workout-card.js` to `config/www/`:

```yaml
resources:
  - url: /local/lutarym-battery-workout-card.js
    type: module
```

## Usage

```yaml
type: custom:lutarym-battery-workout-card
title: Batterie-Test
entity_discharge_power: sensor.batterie_entladeleistung
entity_charge_power: sensor.batterie_ladeleistung
entity_soc: sensor.batterie_ladezustand
mood_state: normal
max_watt: 3000
icon_size: 160
```

A small debug line at the bottom of the card shows the raw values the
card is reading (`dis=... chg=... soc=... mood=... speed=...`), useful
while wiring up entities.

## Status

Development/test card — not a final polished release. Once the
character animation is confirmed working here, it gets merged back into
`lutarym-pv-card` unchanged.

## License

Private / personal use.
