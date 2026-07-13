/**
 * lutarym-pv-card.js
 * Lovelace Custom Card — modern animated power flow visualization
 *
 * Shows a hub-and-spoke energy flow diagram (PV, grid, battery, wallbox,
 * heat pump, and two freely configurable "extra" consumers, all flowing
 * into/out of a central house node). Flow direction and animation speed
 * are derived from the live entity values. All node entities are optional
 * — a node simply doesn't render when its entity isn't configured, exactly
 * like lutarym-pv-mood-card.
 *
 * INSTALLATION
 *   1. Copy the file to /config/www/lutarym-pv-card.js
 *   2. Settings > Dashboards > Resources > Add resource:
 *        URL:  /local/lutarym-pv-card.js
 *        Type: JavaScript Module
 *   3. Clear your browser cache (Ctrl+F5)
 *
 * CONFIGURATION
 *   type: custom:lutarym-pv-card
 *   title: Energiefluss                              # optional
 *   entity_house: sensor.hausverbrauch                # optional, total consumption shown in the hub
 *   entity_pv: sensor.pv_leistung                       # optional (W or kW)
 *   entity_grid: sensor.netzleistung                     # optional (W or kW; positive = Bezug, negative = Einspeisung)
 *   entity_battery_power: sensor.batterie_leistung          # optional (W or kW; positive = Entladen, negative = Laden)
 *   entity_battery_soc: sensor.batterie_soc                   # optional (%), shown under the battery node
 *   entity_wallbox: sensor.wallbox_leistung                     # optional (W or kW)
 *   entity_heatpump: sensor.waermepumpe_leistung                  # optional (W or kW)
 *   extra1_entity: sensor.sommerhaus_leistung                       # optional (W or kW)
 *   extra1_name: Sommerhaus                                           # optional, default: "Extra 1" / "Extra 1"
 *   extra1_icon: mdi:home-outline                                      # optional, default: mdi:power-plug
 *   extra2_entity: sensor.sonstiges_leistung                             # optional
 *   extra2_name: Sonstiges                                                # optional
 *   extra2_icon: mdi:dots-horizontal                                       # optional
 *   max_watt: 5000                                                          # optional, reference power for line thickness/speed scaling (default 5000)
 *   icon_size: 52                                                            # optional, node circle diameter in px (default 52)
 */

// ── Simple i18n helper (falls back to English) ─────────────────────────

const I18N = {
  en: {
    defaultTitle: 'Power flow',
    house: 'House',
    pv: 'Solar',
    grid: 'Grid',
    gridImport: 'Draw',
    gridExport: 'Feed-in',
    battery: 'Battery',
    batteryCharging: 'Charging',
    batteryDischarging: 'Discharging',
    wallbox: 'Wallbox',
    heatpump: 'Heat pump',
    extraDefault: 'Extra {n}',
    editorEntityHouse: 'House consumption entity (optional)',
    editorEntityPv: 'PV power entity (optional)',
    editorEntityGrid: 'Grid entity (optional, negative = feed-in)',
    editorEntityBatteryPower: 'Battery power entity (optional, positive = discharging)',
    editorEntityBatterySoc: 'Battery state of charge (optional, %)',
    editorEntityWallbox: 'Wallbox power entity (optional)',
    editorEntityHeatpump: 'Heat pump power entity (optional)',
    editorExtraEntity: 'Extra {n} power entity (optional)',
    editorExtraName: 'Extra {n} name',
    editorExtraIcon: 'Extra {n} icon',
    editorTitle: 'Title',
    editorTitleHint: 'Optional — default: {title}',
    editorMaxWatt: 'Reference power (W)',
    editorMaxWattHint: 'Used to scale line thickness and animation speed. Set roughly to your typical peak power flow.',
    editorIconSize: 'Icon size (px)',
    editorIconSizeHint: 'Diameter of the node circles. Default: 52px.',
    cardName: 'PV Flow by Lutarym',
    cardDescription: 'Modern animated power flow diagram for solar, grid, battery, wallbox, heat pump and two extra consumers.',
  },
  de: {
    defaultTitle: 'Energiefluss',
    house: 'Haus',
    pv: 'PV',
    grid: 'Netz',
    gridImport: 'Bezug',
    gridExport: 'Einspeisung',
    battery: 'Batterie',
    batteryCharging: 'Lädt',
    batteryDischarging: 'Entlädt',
    wallbox: 'Wallbox',
    heatpump: 'Wärmepumpe',
    extraDefault: 'Extra {n}',
    editorEntityHouse: 'Hausverbrauch-Entity (optional)',
    editorEntityPv: 'PV-Leistung-Entity (optional)',
    editorEntityGrid: 'Netz-Entity (optional, negativ = Einspeisung)',
    editorEntityBatteryPower: 'Batterie-Leistung-Entity (optional, positiv = Entladen)',
    editorEntityBatterySoc: 'Batterie-Ladezustand (optional, %)',
    editorEntityWallbox: 'Wallbox-Leistung-Entity (optional)',
    editorEntityHeatpump: 'Wärmepumpe-Leistung-Entity (optional)',
    editorExtraEntity: 'Extra {n} Leistung-Entity (optional)',
    editorExtraName: 'Extra {n} Name',
    editorExtraIcon: 'Extra {n} Icon',
    editorTitle: 'Titel',
    editorTitleHint: 'Optional — Standard: {title}',
    editorMaxWatt: 'Referenzleistung (W)',
    editorMaxWattHint: 'Bestimmt Linienstärke und Animationsgeschwindigkeit. Ungefähr auf deinen typischen Spitzenfluss einstellen.',
    editorIconSize: 'Symbolgröße (px)',
    editorIconSizeHint: 'Durchmesser der Knoten-Kreise. Standard: 52px.',
    cardName: 'PV Flow by Lutarym',
    cardDescription: 'Modernes animiertes Energiefluss-Diagramm für PV, Netz, Batterie, Wallbox, Wärmepumpe und zwei frei wählbare Verbraucher.',
  },
};

function lutarymLang(hass) {
  const raw = (hass && hass.language) || (typeof navigator !== 'undefined' ? navigator.language : 'en') || 'en';
  return raw.toLowerCase().startsWith('de') ? 'de' : 'en';
}

function t(hass, key, vars) {
  const dict = I18N[lutarymLang(hass)] || I18N.en;
  let str = dict[key] ?? I18N.en[key] ?? key;
  if (vars) Object.keys(vars).forEach(k => { str = str.replace(`{${k}}`, vars[k]); });
  return str;
}

// ── Node layout (fractions of the 100x100 SVG viewBox — no resize math
//    needed, the SVG stretches non-uniformly via preserveAspectRatio="none"
//    to match the percentage-positioned HTML node divs exactly) ──────────

const NODE_LAYOUT = {
  pv:        { x: 17, y: 15 },
  wallbox:   { x: 50, y: 15 },
  heatpump:  { x: 83, y: 17 },
  grid:      { x: 12, y: 52 },
  house:     { x: 50, y: 52 },
  battery:   { x: 17, y: 87 },
  extra1:    { x: 50, y: 87 },
  extra2:    { x: 83, y: 84 },
};

const NODE_COLOR = {
  pv: '#e0a020',
  wallbox: '#d9584a',
  heatpump: '#c93368',
  grid: '#3b82c9',
  battery: '#7c4fd6',
  extra1: '#0f9d78',
  extra2: '#7a7a7a',
};

const NODE_ICON = {
  pv: 'mdi:solar-power',
  wallbox: 'mdi:car-electric',
  heatpump: 'mdi:heat-pump',
  grid: 'mdi:transmission-tower',
  battery: 'mdi:battery-high',
  house: 'mdi:home',
};

// Quadratic-bezier control point roughly between two node centers, bowed
// slightly toward the house so lines don't overlap each other visually.
function curvePath(from, to) {
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  return `M ${from.x} ${from.y} Q ${mx} ${my} ${to.x} ${to.y}`;
}

function durationFor(powerW, maxWatt) {
  const ratio = Math.max(0, Math.min(Math.abs(powerW) / Math.max(maxWatt, 1), 1));
  return (3 - ratio * 2.4).toFixed(2); // 3s (low power) → 0.6s (at/above max_watt)
}
function widthFor(powerW, maxWatt) {
  const ratio = Math.max(0, Math.min(Math.abs(powerW) / Math.max(maxWatt, 1), 1));
  return (1 + ratio * 3).toFixed(2);
}
// Character animation speed: slower baseline than the flow dots (idle
// motion still runs at zero power — everything keeps moving), scaling
// down to a lively pace at/above max_watt.
function charDurationFor(powerW, maxWatt) {
  const ratio = Math.max(0, Math.min(Math.abs(powerW) / Math.max(maxWatt, 1), 1));
  return (6 - ratio * 5).toFixed(2); // 6s idle → 1s energetic
}

// ── Animated node "characters" — small self-contained SVGs, all driven
//    by CSS transform/opacity keyframes only (no JS animation loop). Each
//    inherits its body color from the surrounding .pf-circle via
//    currentColor, and its tempo from the --speed custom property set in
//    _update(). All wrapped by a shared prefers-reduced-motion guard.  ──

// Shared cartoon face — two blinking googly eyes, a curved mouth, and
// optional blush. Reused by every creature so they all read as the same
// comic "species" regardless of body shape.
function faceMarkup(cx, cy, dx, r, mouthDy, blush) {
  return `
    <g class="pf-eye pf-eye-l" style="transform-origin:${cx - dx}px ${cy}px">
      <circle cx="${cx - dx}" cy="${cy}" r="${r}" fill="#fff"/>
      <circle cx="${cx - dx}" cy="${cy}" r="${(r * 0.45).toFixed(1)}" fill="#2b2b2b"/>
    </g>
    <g class="pf-eye pf-eye-r" style="transform-origin:${cx + dx}px ${cy}px">
      <circle cx="${cx + dx}" cy="${cy}" r="${r}" fill="#fff"/>
      <circle cx="${cx + dx}" cy="${cy}" r="${(r * 0.45).toFixed(1)}" fill="#2b2b2b"/>
    </g>
    <path class="pf-mouth" d="M${cx - dx - 1} ${cy + mouthDy} Q${cx} ${cy + mouthDy + 7} ${cx + dx + 1} ${cy + mouthDy}" stroke="#2b2b2b" stroke-width="2" fill="none" stroke-linecap="round"/>
    ${blush ? `
    <circle cx="${cx - dx - 4}" cy="${cy + 4}" r="2.1" fill="#ff8a8a" opacity="0.55"/>
    <circle cx="${cx + dx + 4}" cy="${cy + 4}" r="2.1" fill="#ff8a8a" opacity="0.55"/>` : ''}`;
}

function charSun() {
  return `
    <svg class="pf-char" viewBox="0 0 64 64">
      <g class="pf-sun-rays" stroke="currentColor" stroke-width="3.5" stroke-linecap="round">
        <line x1="32" y1="2" x2="32" y2="11"/>
        <line x1="32" y1="53" x2="32" y2="62"/>
        <line x1="2" y1="32" x2="11" y2="32"/>
        <line x1="53" y1="32" x2="62" y2="32"/>
        <line x1="11.8" y1="11.8" x2="18" y2="18"/>
        <line x1="46" y1="46" x2="52.2" y2="52.2"/>
        <line x1="52.2" y1="11.8" x2="46" y2="18"/>
        <line x1="18" y1="46" x2="11.8" y2="52.2"/>
      </g>
      <g class="pf-wobble-body">
        <circle cx="32" cy="32" r="16" fill="currentColor"/>
        ${faceMarkup(32, 31, 6, 3, 5, true)}
      </g>
    </svg>`;
}

function charGrid() {
  return `
    <svg class="pf-char" viewBox="0 0 64 64">
      <g stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="0.85">
        <path d="M32 20 L20 60 M32 20 L44 60"/>
        <path d="M24 38 L40 38"/>
      </g>
      <g class="pf-zap-body">
        <path d="M34 3 L21 28 L29 28 L25 47 L44 22 L34 22 Z" fill="currentColor"/>
        ${faceMarkup(30, 22, 5, 2.4, 5, true)}
      </g>
    </svg>`;
}

function charBattery() {
  return `
    <svg class="pf-char" viewBox="0 0 64 64">
      <g class="pf-wobble-body">
        <rect x="27" y="12" width="10" height="5" rx="1" fill="currentColor"/>
        <rect x="12" y="17" width="40" height="38" rx="7" fill="currentColor" opacity="0.16"/>
        <rect x="12" y="17" width="40" height="38" rx="7" fill="none" stroke="currentColor" stroke-width="2.5"/>
        <rect x="15" y="38" width="34" height="14" rx="4" fill="currentColor" opacity="0.5"/>
        ${faceMarkup(32, 28, 7, 2.6, 4, true)}
      </g>
      <g class="pf-arms" stroke="currentColor" stroke-width="3" stroke-linecap="round">
        <line x1="12" y1="30" x2="4" y2="14"/>
        <line x1="52" y1="30" x2="60" y2="14"/>
        <line x1="4" y1="14" x2="60" y2="14"/>
        <circle cx="4" cy="14" r="4" fill="currentColor"/>
        <circle cx="60" cy="14" r="4" fill="currentColor"/>
      </g>
    </svg>`;
}

function charWallbox() {
  return `
    <svg class="pf-char" viewBox="0 0 64 64">
      <g class="pf-car">
        <rect x="9" y="32" width="46" height="14" rx="6" fill="currentColor" opacity="0.16"/>
        <rect x="9" y="32" width="46" height="14" rx="6" fill="none" stroke="currentColor" stroke-width="2.5"/>
        <path d="M15 32 L21 21 L43 21 L49 32" fill="currentColor" opacity="0.25" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>
        ${faceMarkup(32, 27, 6, 2.3, 3, false)}
        <g class="pf-wheel-l"><circle cx="19" cy="48" r="5" fill="currentColor"/><line x1="19" y1="45" x2="19" y2="51" stroke="var(--card-background-color,#fff)" stroke-width="1.4"/></g>
        <g class="pf-wheel-r"><circle cx="45" cy="48" r="5" fill="currentColor"/><line x1="45" y1="45" x2="45" y2="51" stroke="var(--card-background-color,#fff)" stroke-width="1.4"/></g>
      </g>
      <path class="pf-bolt" d="M34 20 L28 32 L33 32 L30 42 L40 28 L34 28 Z" fill="currentColor"/>
    </svg>`;
}

function charHeatpump() {
  return `
    <svg class="pf-char" viewBox="0 0 64 64">
      <g class="pf-fan" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" fill="none" opacity="0.9">
        <path d="M32 20 Q41 3 51 8 Q41 11 32 20"/>
        <path d="M32 20 Q49 27 44 38 Q38 29 32 20"/>
        <path d="M32 20 Q15 29 20 40 Q28 33 32 20"/>
      </g>
      <g class="pf-puff-body">
        <circle cx="32" cy="34" r="18" fill="currentColor" opacity="0.18"/>
        <circle cx="32" cy="34" r="18" fill="none" stroke="currentColor" stroke-width="2.5"/>
        ${faceMarkup(32, 32, 6, 2.6, 4, false)}
        <circle class="pf-cheek-l" cx="19" cy="38" r="3" fill="currentColor" opacity="0.5"/>
        <circle class="pf-cheek-r" cx="45" cy="38" r="3" fill="currentColor" opacity="0.5"/>
      </g>
    </svg>`;
}

function charHouse() {
  return `
    <svg class="pf-char" viewBox="0 0 64 64">
      <g class="pf-house-body">
        <path d="M10 30 L32 11 L54 30" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="17" y="28" width="30" height="25" rx="2" fill="currentColor" opacity="0.14"/>
        <rect x="17" y="28" width="30" height="25" rx="2" fill="none" stroke="currentColor" stroke-width="3.5"/>
        <circle cx="24" cy="37" r="2.6" fill="#fff"/><circle cx="24" cy="37" r="1.2" fill="#2b2b2b"/>
        <circle cx="40" cy="37" r="2.6" fill="#fff"/><circle cx="40" cy="37" r="1.2" fill="#2b2b2b"/>
        <rect class="pf-house-mouth" x="28" y="43" width="8" height="10" rx="1.5" fill="#2b2b2b" opacity="0.75"/>
      </g>
    </svg>`;
}

const NODE_CHAR = {
  pv: charSun,
  grid: charGrid,
  battery: charBattery,
  wallbox: charWallbox,
  heatpump: charHeatpump,
};

// ── Main card ────────────────────────────────────────────────────────────

class LutarymPvCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._lastDur = {}; // per-flow-key last animation duration, to avoid re-triggering SMIL on tiny fluctuations
  }

  setConfig(config) {
    this._config = {
      title:            config.title || null, // null = language-dependent default
      entity_house:     config.entity_house || null,
      entity_pv:        config.entity_pv || null,
      entity_grid:      config.entity_grid || null,
      entity_battery_power: config.entity_battery_power || null,
      entity_battery_soc:   config.entity_battery_soc || null,
      entity_wallbox:   config.entity_wallbox || null,
      entity_heatpump:  config.entity_heatpump || null,
      extra1_entity:    config.extra1_entity || null,
      extra1_name:      config.extra1_name || null,
      extra1_icon:      config.extra1_icon || 'mdi:power-plug',
      extra2_entity:    config.extra2_entity || null,
      extra2_name:      config.extra2_name || null,
      extra2_icon:      config.extra2_icon || 'mdi:power-plug',
      max_watt:         Number(config.max_watt) || 5000,
      icon_size:        Number(config.icon_size) || 52,
    };
    this._buildDOM();
  }

  set hass(hass) { this._hass = hass; this._update(); }

  connectedCallback() {}
  disconnectedCallback() {}

  static getConfigElement() {
    return document.createElement('lutarym-pv-card-editor');
  }
  static getStubConfig() {
    return { max_watt: 5000 };
  }
  getCardSize() { return 5; }
  getGridOptions() {
    return { columns: 12, rows: 6, min_rows: 5, min_columns: 6 };
  }

  // ── value helpers (same convention as lutarym-pv-mood-card) ───────────
  _val(id) {
    if (!id || !this._hass) return null;
    const s = this._hass.states[id];
    if (!s) return null;
    const num = parseFloat(s.state);
    if (isNaN(num)) return null;
    const unit = (s.attributes && s.attributes.unit_of_measurement) || '';
    if (unit.toLowerCase().startsWith('kw')) return num * 1000;
    return num;
  }
  _fmt(w) {
    if (w === null || isNaN(w)) return '–';
    return Math.abs(w) >= 1000 ? (w / 1000).toFixed(2) + ' kW' : Math.round(w) + ' W';
  }

  // Which optional nodes are actually configured — drives both DOM build
  // and layout (unconfigured nodes stay hidden, like the mood card's
  // stat blocks).
  _activeNodes() {
    const c = this._config;
    return {
      pv: !!c.entity_pv,
      wallbox: !!c.entity_wallbox,
      heatpump: !!c.entity_heatpump,
      grid: !!c.entity_grid,
      battery: !!c.entity_battery_power,
      extra1: !!c.extra1_entity,
      extra2: !!c.extra2_entity,
    };
  }

  _buildDOM() {
    const hass = this._hass;
    const c = this._config;
    const active = this._activeNodes();
    const title = c.title || t(hass, 'defaultTitle');

    const extra1Name = c.extra1_name || t(hass, 'extraDefault', { n: 1 });
    const extra2Name = c.extra2_name || t(hass, 'extraDefault', { n: 2 });

    const nodeMeta = {
      pv:       { icon: NODE_ICON.pv,       label: t(hass, 'pv'),       color: NODE_COLOR.pv },
      wallbox:  { icon: NODE_ICON.wallbox,  label: t(hass, 'wallbox'),  color: NODE_COLOR.wallbox },
      heatpump: { icon: NODE_ICON.heatpump, label: t(hass, 'heatpump'), color: NODE_COLOR.heatpump },
      grid:     { icon: NODE_ICON.grid,     label: t(hass, 'grid'),    color: NODE_COLOR.grid },
      battery:  { icon: NODE_ICON.battery,  label: t(hass, 'battery'), color: NODE_COLOR.battery },
      extra1:   { icon: c.extra1_icon,      label: extra1Name,         color: NODE_COLOR.extra1 },
      extra2:   { icon: c.extra2_icon,      label: extra2Name,         color: NODE_COLOR.extra2 },
    };

    const nodeDivs = Object.keys(NODE_LAYOUT).filter(k => k !== 'house').map(key => {
      const pos = NODE_LAYOUT[key];
      const meta = nodeMeta[key];
      const visible = active[key];
      const isExtra = key === 'extra1' || key === 'extra2';
      const inner = isExtra
        ? `<ha-icon class="pf-char pf-extra-icon" icon="${meta.icon}"></ha-icon>`
        : NODE_CHAR[key]();
      return `
        <div class="pf-node" id="node-${key}" style="left:${pos.x}%;top:${pos.y}%;${visible ? '' : 'display:none;'}">
          <div class="pf-circle" id="circle-${key}" style="--nc:${meta.color}">
            ${inner}
          </div>
          <div class="pf-label">${meta.label}</div>
          <div class="pf-value" id="val-${key}">–</div>
        </div>`;
    }).join('');

    const housePos = NODE_LAYOUT.house;
    const iconSize = c.icon_size || 52;
    const houseSize = Math.round(iconSize * 1.3);

    // Bidirectional flows (grid, battery) get two overlaid paths, one per
    // direction, toggled via opacity in _update(). Unidirectional flows
    // (pv, wallbox, heatpump, extra1, extra2) get a single path.
    const flowDefs = [
      { key: 'pv',        from: 'pv',       to: 'house',    dir: 'uni' },
      { key: 'grid-in',   from: 'grid',     to: 'house',    dir: 'uni' },
      { key: 'grid-out',  from: 'house',    to: 'grid',     dir: 'uni' },
      { key: 'batt-in',   from: 'battery',  to: 'house',    dir: 'uni' },
      { key: 'batt-out',  from: 'house',    to: 'battery',  dir: 'uni' },
      { key: 'wallbox',   from: 'house',    to: 'wallbox',  dir: 'uni' },
      { key: 'heatpump',  from: 'house',    to: 'heatpump', dir: 'uni' },
      { key: 'extra1',    from: 'house',    to: 'extra1',   dir: 'uni' },
      { key: 'extra2',    from: 'house',    to: 'extra2',   dir: 'uni' },
    ];

    const svgPaths = flowDefs.map(f => {
      const from = NODE_LAYOUT[f.from];
      const to = NODE_LAYOUT[f.to];
      const d = curvePath(from, to);
      const color = NODE_COLOR[f.from] !== undefined && f.from !== 'house' ? NODE_COLOR[f.from] : NODE_COLOR[f.to];
      return `<path id="line-${f.key}" d="${d}" fill="none" stroke="${color}" stroke-width="1" opacity="0" stroke-linecap="round"/>`;
    }).join('');

    const dotHolders = flowDefs.map(f => `<g id="dots-${f.key}"></g>`).join('');

    this.shadowRoot.innerHTML = `
<style>
  :host { display:block; width:100%; height:100%; box-sizing:border-box; font-family:'Segoe UI',Roboto,sans-serif; --comic-ease:cubic-bezier(.65,-0.45,.3,1.4); }
  ha-card { width:100%; height:100%; box-sizing:border-box; padding:16px 14px; display:flex; flex-direction:column; gap:10px; }
  .pf-title { font-size:15px; font-weight:600; letter-spacing:0.02em; color:var(--primary-text-color); }
  .pf-stage { position:relative; width:100%; padding-top:66%; flex:1; }
  .pf-svg { position:absolute; inset:0; width:100%; height:100%; overflow:visible; }
  .pf-node {
    position:absolute; transform:translate(-50%,-50%);
    display:flex; flex-direction:column; align-items:center; gap:2px;
    width:${iconSize + 24}px;
  }
  .pf-circle {
    width:${iconSize}px; height:${iconSize}px; border-radius:50%;
    display:flex; align-items:center; justify-content:center;
    background: color-mix(in srgb, var(--nc) 14%, var(--card-background-color, #fff));
    border:2px solid var(--nc);
    color: var(--nc);
    transition: box-shadow 0.6s ease;
    overflow:visible;
  }
  .pf-circle.pf-active { box-shadow: 0 0 0 4px color-mix(in srgb, var(--nc) 18%, transparent); }
  .pf-char { width:${Math.round(iconSize * 0.62)}px; height:${Math.round(iconSize * 0.62)}px; overflow:visible; }
  .pf-extra-icon { --mdc-icon-size:${Math.round(iconSize * 0.46)}px; }
  .pf-label { font-size:11px; color:var(--secondary-text-color); text-align:center; line-height:1.2; }
  .pf-value { font-size:12px; font-weight:600; color:var(--primary-text-color); text-align:center; }
  .pf-house {
    position:absolute; left:${housePos.x}%; top:${housePos.y}%; transform:translate(-50%,-50%);
    display:flex; flex-direction:column; align-items:center; gap:2px; width:${houseSize + 24}px;
  }
  .pf-house .pf-circle { width:${houseSize}px; height:${houseSize}px; --nc:var(--primary-text-color); }
  .pf-house .pf-char { width:${Math.round(houseSize * 0.62)}px; height:${Math.round(houseSize * 0.62)}px; }
  .pf-house .pf-value { font-size:14px; }
  .pf-dot { r:1.6; }

  /* ── comic-style character animations — bouncy overshoot easing via
     --comic-ease, transform/opacity only, always running at a variable
     pace (--speed) so the whole diagram feels alive even at zero power */
  @keyframes pf-spin { to { transform:rotate(360deg); } }
  @keyframes pf-wobble { 0%,100% { transform:scale(1,1) rotate(0deg); } 50% { transform:scale(1.1,0.88) rotate(-3deg) translateY(2px); } }
  @keyframes pf-zap { 0%,100% { transform:translateX(0) rotate(0deg); } 25% { transform:translateX(-2.5px) rotate(-6deg); } 50% { transform:translateX(0) rotate(0deg); } 75% { transform:translateX(2.5px) rotate(6deg); } }
  @keyframes pf-lift { 0%,100% { transform:translateY(0) rotate(0deg); } 50% { transform:translateY(-9px) rotate(-4deg); } }
  @keyframes pf-bounce { 0%,100% { transform:translateY(0) scale(1,1); } 45% { transform:translateY(-5px) scale(0.96,1.06); } 55% { transform:translateY(-5px) scale(1.06,0.94); } }
  @keyframes pf-puff { 0%,100% { transform:scale(1); opacity:0.5; } 50% { transform:scale(1.35); opacity:0.85; } }
  @keyframes pf-blink { 0%,88%,100% { transform:scaleY(1); } 94% { transform:scaleY(0.1); } }
  @keyframes pf-house-talk { 0%,100% { transform:scaleY(1); } 50% { transform:scaleY(0.35); } }

  .pf-sun-rays { transform-origin:32px 32px; animation: pf-spin var(--speed,6s) linear infinite; }
  .pf-wobble-body { transform-origin:32px 42px; animation: pf-wobble var(--speed,6s) var(--comic-ease) infinite; }
  .pf-zap-body { transform-origin:30px 40px; animation: pf-zap var(--speed,6s) var(--comic-ease) infinite; }
  .pf-arms { transform-origin:32px 22px; animation: pf-lift var(--speed,6s) var(--comic-ease) infinite; }
  .pf-car { transform-origin:32px 46px; animation: pf-bounce var(--speed,6s) var(--comic-ease) infinite; }
  .pf-wheel-l, .pf-wheel-r { transform-origin:center; animation: pf-spin calc(var(--speed,6s) * 0.5) linear infinite; }
  .pf-bolt { transform-origin:32px 30px; animation: pf-wobble calc(var(--speed,6s) * 0.6) ease-in-out infinite; }
  .pf-fan { transform-origin:32px 20px; animation: pf-spin var(--speed,6s) linear infinite; }
  .pf-puff-body { transform-origin:32px 34px; animation: pf-wobble var(--speed,6s) var(--comic-ease) infinite; }
  .pf-cheek-l, .pf-cheek-r { animation: pf-puff var(--speed,6s) ease-in-out infinite; }
  .pf-house-body { transform-origin:32px 53px; animation: pf-wobble var(--speed,6s) var(--comic-ease) infinite; }
  .pf-house-mouth { transform-origin:32px 48px; animation: pf-house-talk var(--speed,6s) ease-in-out infinite; }
  .pf-extra-icon { animation: pf-bounce var(--speed,6s) var(--comic-ease) infinite; }
  .pf-eye { animation: pf-blink 4.4s ease-in-out infinite; }
  .pf-eye-r { animation-delay: 0.15s; }

  @media (prefers-reduced-motion: reduce) {
    .pf-svg animateMotion { display:none; }
    .pf-sun-rays, .pf-wobble-body, .pf-zap-body, .pf-arms, .pf-car, .pf-wheel-l, .pf-wheel-r,
    .pf-bolt, .pf-fan, .pf-puff-body, .pf-cheek-l, .pf-cheek-r, .pf-house-body, .pf-house-mouth,
    .pf-extra-icon, .pf-eye {
      animation:none;
    }
  }
</style>
<ha-card>
  <div class="pf-title">${title}</div>
  <div class="pf-stage">
    <svg class="pf-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      ${svgPaths}
      ${dotHolders}
    </svg>
    ${nodeDivs}
    <div class="pf-house">
      <div class="pf-circle" id="node-house-circle">
        ${charHouse()}
      </div>
      <div class="pf-label">${t(hass, 'house')}</div>
      <div class="pf-value" id="val-house">–</div>
    </div>
  </div>
</ha-card>
    `;

    this._flowDefs = flowDefs;
    this._update();
  }

  // Sets a flow's visual state: hidden (no power), or flowing with a
  // duration/width/opacity derived from the power magnitude. Only
  // recreates the animated dot when the direction changes or the
  // duration shifts by more than ~15%, so small fluctuations don't
  // restart the animation and cause visible jumps.
  _setFlow(key, powerW, maxWatt) {
    const svg = this.shadowRoot;
    const path = svg.getElementById(`line-${key}`);
    const dotsHolder = svg.getElementById(`dots-${key}`);
    if (!path || !dotsHolder) return;

    if (!powerW || powerW <= 0) {
      path.setAttribute('opacity', '0');
      dotsHolder.innerHTML = '';
      this._lastDur[key] = null;
      return;
    }

    const width = widthFor(powerW, maxWatt);
    const opacity = (0.35 + Math.min(powerW / maxWatt, 1) * 0.5).toFixed(2);
    path.setAttribute('stroke-width', width);
    path.setAttribute('opacity', opacity);

    const dur = durationFor(powerW, maxWatt);
    const prev = this._lastDur[key];
    const changed = prev === null || prev === undefined || Math.abs(dur - prev) / dur > 0.15;
    if (changed) {
      this._lastDur[key] = Number(dur);
      const color = path.getAttribute('stroke');
      dotsHolder.innerHTML = `
        <circle class="pf-dot" fill="${color}"><animateMotion dur="${dur}s" repeatCount="indefinite"><mpath href="#line-${key}"/></animateMotion></circle>
        <circle class="pf-dot" fill="${color}"><animateMotion dur="${dur}s" begin="${dur / 2}s" repeatCount="indefinite"><mpath href="#line-${key}"/></animateMotion></circle>
      `;
    }
  }

  _update() {
    if (!this._config || !this._hass || !this.shadowRoot.querySelector('.pf-stage')) return;
    const c = this._config;
    const hass = this._hass;
    const maxWatt = c.max_watt;

    const pv = this._val(c.entity_pv);
    const grid = this._val(c.entity_grid);
    const battPower = this._val(c.entity_battery_power);
    const battSoc = this._val(c.entity_battery_soc);
    const wallbox = this._val(c.entity_wallbox);
    const heatpump = this._val(c.entity_heatpump);
    const extra1 = this._val(c.extra1_entity);
    const extra2 = this._val(c.extra2_entity);
    const house = this._val(c.entity_house);

    const setVal = (id, text) => {
      const el = this.shadowRoot.getElementById(id);
      if (el) el.textContent = text;
    };
    const setActive = (key, isActive) => {
      const circle = this.shadowRoot.querySelector(`#node-${key} .pf-circle`);
      if (circle) circle.classList.toggle('pf-active', !!isActive);
    };
    const setSpeed = (circleId, powerW) => {
      const circle = this.shadowRoot.getElementById(circleId);
      if (circle) circle.style.setProperty('--speed', `${charDurationFor(powerW || 0, maxWatt)}s`);
    };

    setVal('val-house', house !== null ? this._fmt(house) : '–');
    this.shadowRoot.getElementById('node-house-circle')?.classList.toggle('pf-active', (pv || 0) > 0 || (grid || 0) !== 0);
    setSpeed('node-house-circle', house !== null ? house : (pv || 0) + Math.abs(grid || 0));

    if (c.entity_pv) { setVal('val-pv', this._fmt(pv)); setActive('pv', pv > 0); setSpeed('circle-pv', pv); }
    if (c.entity_wallbox) { setVal('val-wallbox', this._fmt(wallbox)); setActive('wallbox', wallbox > 0); setSpeed('circle-wallbox', wallbox); }
    if (c.entity_heatpump) { setVal('val-heatpump', this._fmt(heatpump)); setActive('heatpump', heatpump > 0); setSpeed('circle-heatpump', heatpump); }
    if (c.extra1_entity) { setVal('val-extra1', this._fmt(extra1)); setActive('extra1', extra1 > 0); setSpeed('circle-extra1', extra1); }
    if (c.extra2_entity) { setVal('val-extra2', this._fmt(extra2)); setActive('extra2', extra2 > 0); setSpeed('circle-extra2', extra2); }

    if (c.entity_grid) {
      const imp = grid !== null && grid > 0 ? grid : 0;
      const exp = grid !== null && grid < 0 ? -grid : 0;
      const gridArrow = imp > 0 ? '↓' : (exp > 0 ? '↑' : '·');
      setVal('val-grid', grid !== null ? `${gridArrow} ${this._fmt(imp || exp)}` : '–');
      setActive('grid', imp > 0 || exp > 0);
      setSpeed('circle-grid', imp || exp);
    }
    if (c.entity_battery_power) {
      const dis = battPower !== null && battPower > 0 ? battPower : 0;
      const chg = battPower !== null && battPower < 0 ? -battPower : 0;
      const socTxt = battSoc !== null ? `${Math.round(battSoc)}% · ` : '';
      setVal('val-battery', battPower !== null ? `${socTxt}${this._fmt(dis || chg)}` : (battSoc !== null ? `${Math.round(battSoc)}%` : '–'));
      setActive('battery', dis > 0 || chg > 0);
      setSpeed('circle-battery', dis || chg);
    }

    this._setFlow('pv', pv, maxWatt);
    this._setFlow('grid-in', grid !== null && grid > 0 ? grid : 0, maxWatt);
    this._setFlow('grid-out', grid !== null && grid < 0 ? -grid : 0, maxWatt);
    this._setFlow('batt-in', battPower !== null && battPower > 0 ? battPower : 0, maxWatt);
    this._setFlow('batt-out', battPower !== null && battPower < 0 ? -battPower : 0, maxWatt);
    this._setFlow('wallbox', wallbox, maxWatt);
    this._setFlow('heatpump', heatpump, maxWatt);
    this._setFlow('extra1', extra1, maxWatt);
    this._setFlow('extra2', extra2, maxWatt);
  }
}

customElements.define('lutarym-pv-card', LutarymPvCard);

// ── Editor ───────────────────────────────────────────────────────────────

const EXTRA_ICON_CHOICES = [
  'mdi:power-plug', 'mdi:home-outline', 'mdi:dots-horizontal', 'mdi:fan',
  'mdi:television', 'mdi:washing-machine', 'mdi:fridge-outline', 'mdi:pool',
  'mdi:garage-variant', 'mdi:server-network', 'mdi:lightbulb-group-outline',
];

class LutarymPvCardEditor extends HTMLElement {
  setConfig(config) { this._config = config; this._render(); }
  set hass(hass) {
    this._hass = hass;
    // Do NOT re-render the whole form here — hass updates fire constantly
    // (every state change), and rebuilding the DOM mid-click wipes out
    // whatever checkbox/input the user just touched before the change
    // event can fire. Only refresh the hass reference on existing
    // ha-selector elements, same as lutarym-pv-mood-card's editor.
    this.querySelectorAll('ha-selector').forEach(sel => { sel.hass = hass; });
  }

  _onChange(field, value) {
    this._config = { ...this._config, [field]: value === '' ? null : value };
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
  }

  _toggleableEntityRow(label, field, value) {
    // Whether the row is "open" (selector visible) must survive a
    // re-render even before an entity has been picked — otherwise the
    // checkbox is derived purely from !!value, which is still null right
    // after checking it, and the box appears to un-check itself the
    // instant setConfig()/_render() runs again.
    this._openFields = this._openFields || new Set();
    if (value) this._openFields.add(field);
    const isOpen = !!value || this._openFields.has(field);

    const wrap = document.createElement('div');
    wrap.className = 'row toggle-entity-row';
    const header = document.createElement('div');
    header.className = 'toggle-header';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = isOpen;
    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    header.appendChild(checkbox);
    header.appendChild(labelEl);
    wrap.appendChild(header);

    const selectorWrap = document.createElement('div');
    selectorWrap.className = 'toggle-entity-selector';
    selectorWrap.style.display = isOpen ? '' : 'none';
    const selector = document.createElement('ha-selector');
    selector.hass = this._hass;
    selector.selector = { entity: {} };
    selector.value = value ?? '';
    selector.addEventListener('value-changed', ev => {
      ev.stopPropagation();
      this._onChange(field, ev.detail.value);
    });
    selectorWrap.appendChild(selector);
    wrap.appendChild(selectorWrap);

    checkbox.addEventListener('change', ev => {
      if (ev.target.checked) {
        this._openFields.add(field);
        selectorWrap.style.display = '';
      } else {
        this._openFields.delete(field);
        selectorWrap.style.display = 'none';
        selector.value = '';
        this._onChange(field, null);
      }
    });
    return wrap;
  }

  _textRow(label, field, value, placeholder) {
    const wrap = document.createElement('div');
    wrap.className = 'row';
    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = value || '';
    if (placeholder) input.placeholder = placeholder;
    input.addEventListener('input', ev => this._onChange(field, ev.target.value));
    wrap.appendChild(labelEl);
    wrap.appendChild(input);
    return wrap;
  }

  _numberRow(label, field, value, hint) {
    const wrap = document.createElement('div');
    wrap.className = 'row';
    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    const input = document.createElement('input');
    input.type = 'number';
    input.value = value;
    input.addEventListener('input', ev => this._onChange(field, Number(ev.target.value)));
    wrap.appendChild(labelEl);
    wrap.appendChild(input);
    if (hint) { const h = document.createElement('div'); h.className = 'hint'; h.textContent = hint; wrap.appendChild(h); }
    return wrap;
  }

  _iconSelectRow(label, field, value) {
    const wrap = document.createElement('div');
    wrap.className = 'row';
    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    const select = document.createElement('select');
    EXTRA_ICON_CHOICES.forEach(icon => {
      const opt = document.createElement('option');
      opt.value = icon;
      opt.textContent = icon;
      opt.selected = icon === value;
      select.appendChild(opt);
    });
    select.addEventListener('change', ev => this._onChange(field, ev.target.value));
    wrap.appendChild(labelEl);
    wrap.appendChild(select);
    return wrap;
  }

  _sideBySide(...rows) {
    const wrap = document.createElement('div');
    wrap.className = 'row-pair';
    rows.forEach(r => wrap.appendChild(r));
    return wrap;
  }

  _render() {
    if (!this._config) return;
    const cfg = this._config;
    const hass = this._hass;

    this.innerHTML = `
      <style>
        .form { display:flex; flex-direction:column; gap:14px; padding:4px 0; }
        .row { display:flex; flex-direction:column; gap:4px; }
        .row label { font-size:13px; font-weight:500; color:var(--primary-text-color); }
        .row input[type="text"], .row input[type="number"], .row select {
          padding:8px 10px; border:1px solid var(--divider-color,#ccc);
          border-radius:6px; background:var(--card-background-color,#fff);
          color:var(--primary-text-color); font-size:14px; box-sizing:border-box;
        }
        .hint { font-size:11px; color:var(--secondary-text-color); }
        .section-title { font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:var(--secondary-text-color); margin-top:6px; }
        .toggle-entity-row { gap:6px; }
        .toggle-header { display:flex; align-items:center; gap:8px; }
        .toggle-header input[type="checkbox"] { width:16px; height:16px; cursor:pointer; flex-shrink:0; }
        .toggle-header label { margin:0; cursor:pointer; }
        .toggle-entity-selector { margin-left:24px; }
        .row-pair { display:flex; gap:16px; }
        .row-pair > .row { flex:1; min-width:0; }
      </style>
      <div class="form"></div>
    `;
    const form = this.querySelector('.form');

    form.appendChild(this._textRow(t(hass, 'editorTitle'), 'title', cfg.title, t(hass, 'defaultTitle')));
    form.appendChild(this._toggleableEntityRow(t(hass, 'editorEntityHouse'), 'entity_house', cfg.entity_house));

    const sect = txt => { const d = document.createElement('div'); d.className = 'section-title'; d.textContent = txt; form.appendChild(d); };

    sect('PV / ' + t(hass, 'grid') + ' / ' + t(hass, 'battery'));
    form.appendChild(this._toggleableEntityRow(t(hass, 'editorEntityPv'), 'entity_pv', cfg.entity_pv));
    form.appendChild(this._toggleableEntityRow(t(hass, 'editorEntityGrid'), 'entity_grid', cfg.entity_grid));
    form.appendChild(this._toggleableEntityRow(t(hass, 'editorEntityBatteryPower'), 'entity_battery_power', cfg.entity_battery_power));
    form.appendChild(this._toggleableEntityRow(t(hass, 'editorEntityBatterySoc'), 'entity_battery_soc', cfg.entity_battery_soc));

    sect(t(hass, 'wallbox') + ' / ' + t(hass, 'heatpump'));
    form.appendChild(this._toggleableEntityRow(t(hass, 'editorEntityWallbox'), 'entity_wallbox', cfg.entity_wallbox));
    form.appendChild(this._toggleableEntityRow(t(hass, 'editorEntityHeatpump'), 'entity_heatpump', cfg.entity_heatpump));

    sect(t(hass, 'editorExtraEntity', { n: 1 }).replace(/ \(optional\)$/, ''));
    form.appendChild(this._toggleableEntityRow(t(hass, 'editorExtraEntity', { n: 1 }), 'extra1_entity', cfg.extra1_entity));
    form.appendChild(this._sideBySide(
      this._textRow(t(hass, 'editorExtraName', { n: 1 }), 'extra1_name', cfg.extra1_name, t(hass, 'extraDefault', { n: 1 })),
      this._iconSelectRow(t(hass, 'editorExtraIcon', { n: 1 }), 'extra1_icon', cfg.extra1_icon || 'mdi:power-plug'),
    ));

    sect(t(hass, 'editorExtraEntity', { n: 2 }).replace(/ \(optional\)$/, ''));
    form.appendChild(this._toggleableEntityRow(t(hass, 'editorExtraEntity', { n: 2 }), 'extra2_entity', cfg.extra2_entity));
    form.appendChild(this._sideBySide(
      this._textRow(t(hass, 'editorExtraName', { n: 2 }), 'extra2_name', cfg.extra2_name, t(hass, 'extraDefault', { n: 2 })),
      this._iconSelectRow(t(hass, 'editorExtraIcon', { n: 2 }), 'extra2_icon', cfg.extra2_icon || 'mdi:power-plug'),
    ));

    sect(t(hass, 'editorMaxWatt'));
    form.appendChild(this._sideBySide(
      this._numberRow(t(hass, 'editorMaxWatt'), 'max_watt', cfg.max_watt ?? 5000, t(hass, 'editorMaxWattHint')),
      this._numberRow(t(hass, 'editorIconSize'), 'icon_size', cfg.icon_size ?? 52, t(hass, 'editorIconSizeHint')),
    ));
  }
}

customElements.define('lutarym-pv-card-editor', LutarymPvCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'lutarym-pv-card',
  name: 'PV Flow by Lutarym',
  description: 'Modern animated power flow diagram for solar, grid, battery, wallbox, heat pump and two extra consumers.',
  preview: true,
});
