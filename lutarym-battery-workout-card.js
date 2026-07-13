/**
 * lutarym-battery-workout-card.js
 * Standalone test card — the animated weightlifting battery character on
 * its own, free of any surrounding circle. Purpose: iterate on and verify
 * individual character animations in a minimal environment before they
 * get composed back into lutarym-pv-card.
 *
 * INSTALLATION via HACS
 *   1. HACS → Frontend → ⋮ → Custom repositories
 *   2. Enter this repository's URL, category Dashboard
 *   3. Install "Battery Workout (Test) by Lutarym"
 *   4. Reload Home Assistant (Ctrl+F5 / clear cache)
 *
 * MANUAL INSTALLATION
 *   Copy to config/www/lutarym-battery-workout-card.js and add as a
 *   resource (type: JavaScript Module). Bump the ?v= query string on
 *   every update to bypass the browser's module cache.
 *
 * CONFIGURATION
 *   type: custom:lutarym-battery-workout-card
 *   title: Batterie-Test                                    # optional
 *   entity_discharge_power: sensor.batterie_entladeleistung    # optional (W or kW, always ≥ 0)
 *   entity_charge_power: sensor.batterie_ladeleistung             # optional (W or kW, always ≥ 0)
 *   entity_soc: sensor.batterie_ladezustand                          # optional (%)
 *   mood_state: normal                                                 # optional, one of: empty | weak | normal | full
 *                                                                        # reserved for future mood-driven animation states —
 *                                                                        # not yet wired to the visuals, just present in config.
 *   max_watt: 3000                                                       # optional, reference power for animation speed (default 3000)
 *   icon_size: 160                                                        # optional, character size in px (default 160)
 */

const CARD_VERSION = '0.3.0';

const MOOD_STATES = ['empty', 'weak', 'normal', 'full'];
const MOOD_LABELS_DE = { empty: 'Leer', weak: 'Schwach', normal: 'Normal', full: 'Voll' };
const MOOD_LABELS_EN = { empty: 'Empty', weak: 'Weak', normal: 'Normal', full: 'Full' };

function lutarymLang(hass) {
  const raw = (hass && hass.language) || (typeof navigator !== 'undefined' ? navigator.language : 'en') || 'en';
  return raw.toLowerCase().startsWith('de') ? 'de' : 'en';
}

// Shared cartoon face — two blinking googly eyes, a curved mouth, and
// optional blush. Identical to the one used in lutarym-pv-card, so the
// character can be copy-pasted back 1:1 once verified here.
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

// currentColor is driven by CSS on the wrapping element (no circle/border
// anymore — the battery just floats freely on the card background).
function charBattery() {
  return `
    <svg class="pf-char" viewBox="0 0 64 64">
      <g class="pf-wobble-body">
        <rect x="27" y="12" width="10" height="5" rx="1" fill="currentColor"/>
        <rect x="12" y="17" width="40" height="38" rx="7" fill="currentColor" opacity="0.16"/>
        <rect x="12" y="17" width="40" height="38" rx="7" fill="none" stroke="currentColor" stroke-width="2.5"/>
        <rect class="pf-batt-fill" x="15" y="38" width="34" height="14" rx="4" fill="currentColor" opacity="0.5"/>
        ${faceMarkup(32, 28, 7, 2.6, 4, true)}
        <g class="pf-arms" stroke="currentColor" stroke-width="3" stroke-linecap="round">
          <line x1="12" y1="30" x2="4" y2="14"/>
          <line x1="52" y1="30" x2="60" y2="14"/>
          <line x1="4" y1="14" x2="60" y2="14"/>
          <circle cx="4" cy="14" r="4" fill="currentColor"/>
          <circle cx="60" cy="14" r="4" fill="currentColor"/>
        </g>
      </g>
    </svg>`;
}

function charDurationFor(powerW, maxWatt) {
  const ratio = Math.max(0, Math.min(Math.abs(powerW) / Math.max(maxWatt, 1), 1));
  return (6 - ratio * 5).toFixed(2); // 6s idle → 1s energetic
}

class LutarymBatteryWorkoutCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    this._config = {
      title: config.title || null,
      entity_discharge_power: config.entity_discharge_power || null,
      entity_charge_power: config.entity_charge_power || null,
      entity_soc: config.entity_soc || null,
      mood_state: MOOD_STATES.includes(config.mood_state) ? config.mood_state : 'normal',
      max_watt: Number(config.max_watt) || 3000,
      icon_size: Number(config.icon_size) || 160,
    };
    this._buildDOM();
  }

  set hass(hass) { this._hass = hass; this._update(); }

  static getConfigElement() { return document.createElement('lutarym-battery-workout-card-editor'); }
  static getStubConfig() { return { max_watt: 3000, icon_size: 160, mood_state: 'normal' }; }
  getCardSize() { return 3; }

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

  _buildDOM() {
    const c = this._config;
    const size = c.icon_size;
    const title = c.title || 'Batterie-Test';

    this.shadowRoot.innerHTML = `
<style>
  :host { display:block; width:100%; font-family:'Segoe UI',Roboto,sans-serif; --comic-ease:cubic-bezier(.65,-0.45,.3,1.4); --nc:#7c4fd6; }
  ha-card { padding:16px; display:flex; flex-direction:column; align-items:center; gap:8px; }
  .pf-title { align-self:flex-start; font-size:15px; font-weight:600; color:var(--primary-text-color); }
  .pf-version { font-size:11px; font-weight:400; color:var(--secondary-text-color); opacity:0.6; }
  /* No circle wrapper anymore — the character floats freely, colored via currentColor. */
  .pf-char { width:${size}px; height:${size}px; overflow:visible; color:var(--nc); }
  .pf-value { font-size:16px; font-weight:600; color:var(--primary-text-color); }
  .pf-debug { font-size:11px; color:var(--secondary-text-color); opacity:0.7; }

  @keyframes pf-wobble { 0%,100% { transform:scale(1,1) rotate(0deg); } 50% { transform:scale(1.1,0.88) rotate(-3deg) translateY(2px); } }
  @keyframes pf-lift { 0%,100% { transform:translateY(0) rotate(0deg); } 50% { transform:translateY(-9px) rotate(-4deg); } }
  @keyframes pf-blink { 0%,88%,100% { transform:scaleY(1); } 94% { transform:scaleY(0.1); } }

  .pf-wobble-body { transform-origin:32px 42px; animation: pf-wobble var(--speed,6s) var(--comic-ease) infinite; }
  .pf-arms { transform-origin:32px 22px; animation: pf-lift var(--speed,6s) var(--comic-ease) infinite; }
  .pf-eye { animation: pf-blink 4.4s ease-in-out infinite; }
  .pf-eye-r { animation-delay: 0.15s; }

  @media (prefers-reduced-motion: reduce) {
    .pf-wobble-body, .pf-arms, .pf-eye { animation:none; }
  }
</style>
<ha-card>
  <div class="pf-title">${title} <span class="pf-version">· v${CARD_VERSION}</span></div>
  ${charBattery()}
  <div class="pf-value" id="val-battery">–</div>
  <div class="pf-debug" id="pf-debug">–</div>
</ha-card>
    `;
    this._update();
  }

  _update() {
    if (!this._config || !this._hass || !this.shadowRoot.querySelector('.pf-char')) return;
    const c = this._config;
    const dis = this._val(c.entity_discharge_power);
    const chg = this._val(c.entity_charge_power);
    const soc = this._val(c.entity_soc);

    const speedBasis = Math.max(dis || 0, chg || 0);
    const charEl = this.shadowRoot.querySelector('.pf-char');
    if (charEl) charEl.style.setProperty('--speed', `${charDurationFor(speedBasis, c.max_watt)}s`);

    const socTxt = soc !== null ? `${Math.round(soc)}% · ` : '';
    let flowTxt = '–';
    if (dis !== null && dis > 0) flowTxt = `↑ ${this._fmt(dis)}`;
    else if (chg !== null && chg > 0) flowTxt = `↓ ${this._fmt(chg)}`;
    else if (dis !== null || chg !== null) flowTxt = '·';
    const val = this.shadowRoot.getElementById('val-battery');
    if (val) val.textContent = soc !== null || dis !== null || chg !== null ? `${socTxt}${flowTxt}` : '–';

    const dbg = this.shadowRoot.getElementById('pf-debug');
    if (dbg) dbg.textContent = `dis=${dis} chg=${chg} soc=${soc} mood=${c.mood_state} speed=${charDurationFor(speedBasis, c.max_watt)}s`;
  }
}

customElements.define('lutarym-battery-workout-card', LutarymBatteryWorkoutCard);

// ── Minimal editor ─────────────────────────────────────────────────────

class LutarymBatteryWorkoutCardEditor extends HTMLElement {
  setConfig(config) { this._config = config; this._render(); }
  set hass(hass) {
    this._hass = hass;
    this.querySelectorAll('ha-selector').forEach(sel => { sel.hass = hass; });
  }

  _onChange(field, value) {
    this._config = { ...this._config, [field]: value === '' ? null : value };
    this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this._config }, bubbles: true, composed: true }));
  }

  _toggleableEntityRow(label, field, value) {
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

  _numberRow(label, field, value) {
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
    return wrap;
  }

  _selectRow(label, field, value, options, labels) {
    const wrap = document.createElement('div');
    wrap.className = 'row';
    const labelEl = document.createElement('label');
    labelEl.textContent = label;
    const select = document.createElement('select');
    options.forEach(opt => {
      const optEl = document.createElement('option');
      optEl.value = opt;
      optEl.textContent = labels[opt] || opt;
      optEl.selected = opt === value;
      select.appendChild(optEl);
    });
    select.addEventListener('change', ev => this._onChange(field, ev.target.value));
    wrap.appendChild(labelEl);
    wrap.appendChild(select);
    return wrap;
  }

  _render() {
    if (!this._config) return;
    const cfg = this._config;
    const lang = lutarymLang(this._hass);
    const moodLabels = lang === 'de' ? MOOD_LABELS_DE : MOOD_LABELS_EN;

    this.innerHTML = `
      <style>
        .form { display:flex; flex-direction:column; gap:14px; padding:4px 0; }
        .row { display:flex; flex-direction:column; gap:4px; }
        .row label { font-size:13px; font-weight:500; color:var(--primary-text-color); }
        .row input[type="text"], .row input[type="number"], .row select {
          padding:8px 10px; border:1px solid var(--divider-color,#ccc); border-radius:6px;
          background:var(--card-background-color,#fff); color:var(--primary-text-color); font-size:14px; box-sizing:border-box;
        }
        .toggle-header { display:flex; align-items:center; gap:8px; }
        .toggle-header input[type="checkbox"] { width:16px; height:16px; cursor:pointer; flex-shrink:0; }
        .toggle-header label { margin:0; cursor:pointer; }
        .toggle-entity-selector { margin-left:24px; }
        .hint { font-size:11px; color:var(--secondary-text-color); }
      </style>
      <div class="form"></div>
    `;
    const form = this.querySelector('.form');
    form.appendChild(this._toggleableEntityRow(
      lang === 'de' ? 'Entladeleistung-Entity' : 'Discharge power entity', 'entity_discharge_power', cfg.entity_discharge_power));
    form.appendChild(this._toggleableEntityRow(
      lang === 'de' ? 'Ladeleistung-Entity' : 'Charge power entity', 'entity_charge_power', cfg.entity_charge_power));
    form.appendChild(this._toggleableEntityRow(
      lang === 'de' ? 'Ladezustand-Entity (SOC, %)' : 'State of charge entity (%)', 'entity_soc', cfg.entity_soc));
    form.appendChild(this._selectRow(
      lang === 'de' ? 'Batterie-Zustand (für zukünftige Animationen)' : 'Battery mood (reserved for future animations)',
      'mood_state', cfg.mood_state || 'normal', MOOD_STATES, moodLabels));
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = lang === 'de'
      ? 'Wird aktuell noch nicht ausgewertet — Platzhalter für kommende Zustands-Animationen.'
      : 'Not evaluated yet — placeholder for upcoming mood-driven animations.';
    form.appendChild(hint);
    form.appendChild(this._numberRow(lang === 'de' ? 'Referenzleistung (W)' : 'Reference power (W)', 'max_watt', cfg.max_watt ?? 3000));
    form.appendChild(this._numberRow(lang === 'de' ? 'Symbolgröße (px)' : 'Icon size (px)', 'icon_size', cfg.icon_size ?? 160));
  }
}

customElements.define('lutarym-battery-workout-card-editor', LutarymBatteryWorkoutCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'lutarym-battery-workout-card',
  name: 'Battery Workout (Test) by Lutarym',
  description: 'Standalone animated weightlifting battery character — discharge/charge power and SOC, no surrounding circle.',
  preview: true,
});
