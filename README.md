# PV Flow by Lutarym

Lovelace Custom Card for Home Assistant — a modern, animated power flow
diagram. A house node sits at the center, with solar, grid, battery,
wallbox, heat pump, and two freely configurable extra consumers arranged
around it. Flow lines between each node animate with moving dots whose
speed, thickness, and opacity scale with the live power value, and
direction follows the sign of the entity (grid draw vs. feed-in, battery
charging vs. discharging). All node entities are optional — the
corresponding node and its flow line simply don't render whenever its
entity isn't configured. The card and its editor are fully bilingual
(German/English), following `hass.language` automatically.

## Nodes

| Node | Entity | Convention |
|---|---|---|
| House (center) | `entity_house` | total consumption, display only |
| Solar | `entity_pv` | always ≥ 0 |
| Grid | `entity_grid` | positive = draw from grid, negative = feed-in |
| Battery | `entity_battery_power` | positive = discharging, negative = charging |
| Battery SOC | `entity_battery_soc` | optional, shown alongside the battery power |
| Wallbox | `entity_wallbox` | always ≥ 0 |
| Heat pump | `entity_heatpump` | always ≥ 0 |
| Extra 1 | `extra1_entity` | always ≥ 0, freely named and iconed |
| Extra 2 | `extra2_entity` | always ≥ 0, freely named and iconed |

Every entity accepts W or kW — the unit is read from the entity's
`unit_of_measurement` and converted automatically, same as the other
Lutarym cards.

## Installation via HACS

1. HACS → Frontend → **⋮** → Custom repositories
2. Enter this repository's URL, category **Dashboard**
3. Install "PV Flow by Lutarym"
4. Reload Home Assistant (clear browser cache if needed)

## Manual installation

Copy `lutarym-pv-card.js` to `config/www/`:

```yaml
resources:
  - url: /local/lutarym-pv-card.js
    type: module
```

## Usage

Add via **Edit Dashboard → Add Card → "PV Flow by Lutarym"** — opens the
visual configuration form directly.

```yaml
type: custom:lutarym-pv-card
title: Energiefluss                              # optional
entity_house: sensor.hausverbrauch                 # optional, shown in the center hub
entity_pv: sensor.pv_leistung                        # optional (W or kW)
entity_grid: sensor.netzleistung                       # optional (W or kW; negative = feed-in)
entity_battery_power: sensor.batterie_leistung           # optional (W or kW; positive = discharging)
entity_battery_soc: sensor.batterie_soc                    # optional (%)
entity_wallbox: sensor.wallbox_leistung                      # optional (W or kW)
entity_heatpump: sensor.waermepumpe_leistung                   # optional (W or kW)
extra1_entity: sensor.sommerhaus_leistung                        # optional (W or kW)
extra1_name: Sommerhaus                                            # optional, default "Extra 1"
extra1_icon: mdi:home-outline                                        # optional, default mdi:power-plug
extra2_entity: sensor.sonstiges_leistung                              # optional
extra2_name: Sonstiges                                                  # optional
extra2_icon: mdi:dots-horizontal                                         # optional
max_watt: 5000                                                            # optional, reference power for line thickness/speed (default 5000)
```

`entity_house` is display-only — the card does not attempt to derive
total consumption from the other entities, since sign conventions differ
too much between setups to guess reliably. Feed it your own template
sensor if you have one.

## Layout

The diagram uses a percentage-based grid (an SVG overlay stretched via
`preserveAspectRatio="none"` to exactly match the node positions), so it
scales responsively without recalculating on resize. Works best at
≥ 420px card width; below that, node labels get tight — a compact
layout for narrow cards is a possible future addition.

## License

Private / personal use.
