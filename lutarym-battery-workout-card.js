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

const CARD_VERSION = '0.5.0';

const MOOD_STATES = ['empty', 'weak', 'normal', 'full'];
const MOOD_LABELS_DE = { empty: 'Leer', weak: 'Schwach', normal: 'Normal', full: 'Voll' };
const MOOD_LABELS_EN = { empty: 'Empty', weak: 'Weak', normal: 'Normal', full: 'Full' };

const CHARACTERS = ['battery', 'sun'];
const CHARACTER_LABELS_DE = { battery: 'Batterie', sun: 'Sonne' };
const CHARACTER_LABELS_EN = { battery: 'Battery', sun: 'Sun' };

function lutarymLang(hass) {
  const raw = (hass && hass.language) || (typeof navigator !== 'undefined' ? navigator.language : 'en') || 'en';
  return raw.toLowerCase().startsWith('de') ? 'de' : 'en';
}

// Shared cartoon face — two blinking googly eyes, a curved mouth, and
// optional blush. Identical to the one used in lutarym-pv-card, so the
// character can be copy-pasted back 1:1 once verified here.
function eyesMarkup(cx, cy, dx, r) {
  return `
    <g class="pf-eye pf-eye-l" style="transform-origin:${cx - dx}px ${cy}px">
      <circle cx="${cx - dx}" cy="${cy}" r="${r}" fill="#fff"/>
      <circle cx="${cx - dx}" cy="${cy}" r="${(r * 0.45).toFixed(1)}" fill="#2b2b2b"/>
    </g>
    <g class="pf-eye pf-eye-r" style="transform-origin:${cx + dx}px ${cy}px">
      <circle cx="${cx + dx}" cy="${cy}" r="${r}" fill="#fff"/>
      <circle cx="${cx + dx}" cy="${cy}" r="${(r * 0.45).toFixed(1)}" fill="#2b2b2b"/>
    </g>`;
}

function faceMarkup(cx, cy, dx, r, mouthDy, blush) {
  return `
    ${eyesMarkup(cx, cy, dx, r)}
    <path class="pf-mouth" d="M${cx - dx - 1} ${cy + mouthDy} Q${cx} ${cy + mouthDy + 7} ${cx + dx + 1} ${cy + mouthDy}" stroke="#2b2b2b" stroke-width="2" fill="none" stroke-linecap="round"/>
    ${blush ? `
    <circle cx="${cx - dx - 4}" cy="${cy + 4}" r="2.1" fill="#ff8a8a" opacity="0.55"/>
    <circle cx="${cx + dx + 4}" cy="${cy + 4}" r="2.1" fill="#ff8a8a" opacity="0.55"/>` : ''}`;
}

// currentColor is driven by CSS on the wrapping element (no circle/border
// anymore — the battery just floats freely on the card background).
// Four mood states live inside the same shared body, toggled via display
// so switching moods doesn't require rebuilding the DOM:
//   empty  → erschöpft, Arme hängen schlaff, kein Heben
//   weak   → außer Puste, zittriger schwacher Hebeversuch
//   normal → hebt konzentriert die Hantel (Standardzustand)
//   full   → satt, dicker Bauch, macht gar nichts mehr
function charBattery() {
  return `
    <svg class="pf-char" viewBox="0 0 64 64">
      <g class="pf-wobble-body">
        <rect x="27" y="12" width="10" height="5" rx="1" fill="currentColor"/>
        <rect x="12" y="17" width="40" height="38" rx="7" fill="currentColor" opacity="0.16"/>
        <rect x="12" y="17" width="40" height="38" rx="7" fill="none" stroke="currentColor" stroke-width="2.5"/>
        <rect class="pf-batt-fill" x="15" y="38" width="34" height="14" rx="4" fill="currentColor" opacity="0.5"/>

        <g class="pf-state-empty" style="display:none">
          <path d="M25 26 Q27 29 29 26" stroke="#2b2b2b" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path d="M35 26 Q37 29 39 26" stroke="#2b2b2b" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path d="M26 35 Q32 33 38 35" stroke="#2b2b2b" stroke-width="2" fill="none" stroke-linecap="round"/>
          <line x1="12" y1="30" x2="7" y2="48" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          <line x1="52" y1="30" x2="57" y2="48" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
          <path d="M44 20 Q47 25 44 29 Q41 25 44 20" fill="#5bb8ff" opacity="0.7"/>
        </g>

        <g class="pf-state-weak" style="display:none">
          ${eyesMarkup(32, 28, 7, 2.6)}
          <ellipse cx="32" cy="37" rx="3" ry="4" fill="#2b2b2b"/>
          <path d="M19 19 Q22 24 19 28 Q16 24 19 19" fill="#5bb8ff" opacity="0.7"/>
          <path d="M45 19 Q48 24 45 28 Q42 24 45 19" fill="#5bb8ff" opacity="0.7"/>
          <g class="pf-arms-weak" stroke="currentColor" stroke-width="3" stroke-linecap="round">
            <line x1="12" y1="30" x2="6" y2="20"/>
            <line x1="52" y1="30" x2="58" y2="20"/>
            <line x1="6" y1="20" x2="58" y2="20"/>
            <circle cx="6" cy="20" r="3.5" fill="currentColor"/>
            <circle cx="58" cy="20" r="3.5" fill="currentColor"/>
          </g>
        </g>

        <g class="pf-state-normal" style="display:none">
          ${faceMarkup(32, 28, 7, 2.6, 4, true)}
          <g class="pf-arms" stroke="currentColor" stroke-width="3" stroke-linecap="round">
            <line x1="12" y1="30" x2="4" y2="14"/>
            <line x1="52" y1="30" x2="60" y2="14"/>
            <line x1="4" y1="14" x2="60" y2="14"/>
            <circle cx="4" cy="14" r="4" fill="currentColor"/>
            <circle cx="60" cy="14" r="4" fill="currentColor"/>
          </g>
        </g>

        <g class="pf-state-full" style="display:none">
          <ellipse cx="32" cy="47" rx="18" ry="11" fill="currentColor" opacity="0.22"/>
          <path d="M24 27 Q26 24 28 27" stroke="#2b2b2b" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path d="M36 27 Q38 24 40 27" stroke="#2b2b2b" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path d="M25 33 Q32 39 39 33" stroke="#2b2b2b" stroke-width="2" fill="none" stroke-linecap="round"/>
          <path d="M14 32 Q19 41 27 44" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>
          <path d="M50 32 Q45 41 37 44" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/>
        </g>
      </g>
    </svg>`;
}

// Extracted 1:1 from lutarym-pv-mood-card.js's "SUN CHARACTER" group
// (g-sun): rotating ray rings, pulsing corona, solar flares, and a face
// with blinking eyelids. Always shown in its full "happy" glory here —
// this test card has no PV entity to drive mood staging, that logic
// stays in the mood card. IDs are shadow-DOM-scoped, same as the
// original, so multiple card instances on one dashboard don't collide.
function charSunFull() {
  return `
    <svg class="pf-char pf-sun-svg" viewBox="0 0 196 210" style="overflow:visible">
      <defs>
        <radialGradient id="rg-sun" cx="40%" cy="36%">
          <stop offset="0%" stop-color="#fff9b0"/>
          <stop offset="40%" stop-color="#ffd400"/>
          <stop offset="100%" stop-color="#ff7700"/>
        </radialGradient>
        <radialGradient id="rg-flare" cx="50%" cy="100%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9"/>
          <stop offset="60%" stop-color="#ffdd00" stop-opacity="0.7"/>
          <stop offset="100%" stop-color="#ff6600" stop-opacity="0"/>
        </radialGradient>
        <filter id="f-sun" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="f-soft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.5"/>
        </filter>
      </defs>

      <circle cx="98" cy="108" r="55" fill="none" stroke="#ffe040" stroke-width="2.5" opacity="0.5">
        <animate attributeName="r" values="52;80;52" dur="3s" begin="0s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.55;0;0.55" dur="3s" begin="0s" repeatCount="indefinite"/>
      </circle>
      <circle cx="98" cy="108" r="58" fill="none" stroke="#ffaa00" stroke-width="1.5" opacity="0.5">
        <animate attributeName="r" values="55;86;55" dur="3s" begin="1s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.5;0;0.5" dur="3s" begin="1s" repeatCount="indefinite"/>
      </circle>
      <circle cx="98" cy="108" r="60" fill="none" stroke="#ff8800" stroke-width="1" opacity="0.45">
        <animate attributeName="r" values="58;90;58" dur="3s" begin="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.45;0;0.45" dur="3s" begin="2s" repeatCount="indefinite"/>
      </circle>

      <g opacity="0.85">
        <ellipse cx="98" cy="55" rx="10" ry="26" fill="url(#rg-flare)" filter="url(#f-soft)" transform="rotate(15 98 108)"/>
        <ellipse cx="98" cy="55" rx="8" ry="22" fill="url(#rg-flare)" filter="url(#f-soft)" transform="rotate(-25 98 108)"/>
        <ellipse cx="98" cy="55" rx="9" ry="24" fill="url(#rg-flare)" filter="url(#f-soft)" transform="rotate(160 98 108)"/>
      </g>

      <g opacity="0.35">
        <line x1="98" y1="8" x2="98" y2="32" stroke="#ffe040" stroke-width="4" stroke-linecap="round"/>
        <line x1="98" y1="8" x2="98" y2="32" stroke="#ffe040" stroke-width="4" stroke-linecap="round" transform="rotate(45 98 108)"/>
        <line x1="98" y1="8" x2="98" y2="32" stroke="#ffe040" stroke-width="4" stroke-linecap="round" transform="rotate(90 98 108)"/>
        <line x1="98" y1="8" x2="98" y2="32" stroke="#ffe040" stroke-width="4" stroke-linecap="round" transform="rotate(135 98 108)"/>
        <line x1="98" y1="8" x2="98" y2="32" stroke="#ffe040" stroke-width="4" stroke-linecap="round" transform="rotate(180 98 108)"/>
        <line x1="98" y1="8" x2="98" y2="32" stroke="#ffe040" stroke-width="4" stroke-linecap="round" transform="rotate(225 98 108)"/>
        <line x1="98" y1="8" x2="98" y2="32" stroke="#ffe040" stroke-width="4" stroke-linecap="round" transform="rotate(270 98 108)"/>
        <line x1="98" y1="8" x2="98" y2="32" stroke="#ffe040" stroke-width="4" stroke-linecap="round" transform="rotate(315 98 108)"/>
        <animateTransform attributeName="transform" attributeType="XML" type="rotate" from="0 98 108" to="360 98 108" dur="22s" repeatCount="indefinite"/>
      </g>

      <g opacity="0.42">
        <line x1="98" y1="22" x2="98" y2="44" stroke="#ffdd00" stroke-width="3.5" stroke-linecap="round" transform="rotate(22.5 98 108)"/>
        <line x1="98" y1="22" x2="98" y2="44" stroke="#ffdd00" stroke-width="3.5" stroke-linecap="round" transform="rotate(67.5 98 108)"/>
        <line x1="98" y1="22" x2="98" y2="44" stroke="#ffdd00" stroke-width="3.5" stroke-linecap="round" transform="rotate(112.5 98 108)"/>
        <line x1="98" y1="22" x2="98" y2="44" stroke="#ffdd00" stroke-width="3.5" stroke-linecap="round" transform="rotate(157.5 98 108)"/>
        <line x1="98" y1="22" x2="98" y2="44" stroke="#ffdd00" stroke-width="3.5" stroke-linecap="round" transform="rotate(202.5 98 108)"/>
        <line x1="98" y1="22" x2="98" y2="44" stroke="#ffdd00" stroke-width="3.5" stroke-linecap="round" transform="rotate(247.5 98 108)"/>
        <line x1="98" y1="22" x2="98" y2="44" stroke="#ffdd00" stroke-width="3.5" stroke-linecap="round" transform="rotate(292.5 98 108)"/>
        <line x1="98" y1="22" x2="98" y2="44" stroke="#ffdd00" stroke-width="3.5" stroke-linecap="round" transform="rotate(337.5 98 108)"/>
        <animateTransform attributeName="transform" attributeType="XML" type="rotate" from="0 98 108" to="-360 98 108" dur="15s" repeatCount="indefinite"/>
      </g>

      <g opacity="0.5">
        <line x1="98" y1="36" x2="98" y2="50" stroke="#ffcc00" stroke-width="2.5" stroke-linecap="round" transform="rotate(11.25 98 108)"/>
        <line x1="98" y1="36" x2="98" y2="50" stroke="#ffcc00" stroke-width="2.5" stroke-linecap="round" transform="rotate(56.25 98 108)"/>
        <line x1="98" y1="36" x2="98" y2="50" stroke="#ffcc00" stroke-width="2.5" stroke-linecap="round" transform="rotate(101.25 98 108)"/>
        <line x1="98" y1="36" x2="98" y2="50" stroke="#ffcc00" stroke-width="2.5" stroke-linecap="round" transform="rotate(146.25 98 108)"/>
        <line x1="98" y1="36" x2="98" y2="50" stroke="#ffcc00" stroke-width="2.5" stroke-linecap="round" transform="rotate(191.25 98 108)"/>
        <line x1="98" y1="36" x2="98" y2="50" stroke="#ffcc00" stroke-width="2.5" stroke-linecap="round" transform="rotate(236.25 98 108)"/>
        <line x1="98" y1="36" x2="98" y2="50" stroke="#ffcc00" stroke-width="2.5" stroke-linecap="round" transform="rotate(281.25 98 108)"/>
        <line x1="98" y1="36" x2="98" y2="50" stroke="#ffcc00" stroke-width="2.5" stroke-linecap="round" transform="rotate(326.25 98 108)"/>
        <animateTransform attributeName="transform" attributeType="XML" type="rotate" from="0 98 108" to="360 98 108" dur="9s" repeatCount="indefinite"/>
      </g>

      <circle cx="98" cy="108" r="52" fill="url(#rg-sun)" filter="url(#f-sun)">
        <animate attributeName="r" values="50;53;50" dur="3.5s" repeatCount="indefinite"/>
      </circle>

      <ellipse cx="58" cy="122" rx="12" ry="8" fill="#ff7043" opacity="0.55"/>
      <ellipse cx="138" cy="122" rx="12" ry="8" fill="#ff7043" opacity="0.55"/>

      <ellipse cx="78" cy="100" rx="10" ry="10" fill="white"/>
      <ellipse cx="79" cy="101" rx="5.5" ry="5.5" fill="#1a0a00"/>
      <ellipse cx="81" cy="98" rx="2" ry="2" fill="white"/>
      <rect id="sun-lid-l" x="67" y="90" width="22" height="0" rx="10" fill="#ffd400"/>

      <ellipse cx="118" cy="100" rx="10" ry="10" fill="white"/>
      <ellipse cx="119" cy="101" rx="5.5" ry="5.5" fill="#1a0a00"/>
      <ellipse cx="121" cy="98" rx="2" ry="2" fill="white"/>
      <rect id="sun-lid-r" x="107" y="90" width="22" height="0" rx="10" fill="#ffd400"/>

      <path d="M 67,87 Q 78,82 89,87" stroke="#c85a00" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <path d="M 107,87 Q 118,82 129,87" stroke="#c85a00" stroke-width="3.5" fill="none" stroke-linecap="round"/>

      <path d="M 76,122 Q 98,136 120,122" stroke="#c85a00" stroke-width="4" fill="none" stroke-linecap="round"/>
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
      threshold_empty_pct: Number(config.threshold_empty_pct) || 15,
      threshold_weak_pct: Number(config.threshold_weak_pct) || 40,
      threshold_full_pct: Number(config.threshold_full_pct) || 90,
      character: CHARACTERS.includes(config.character) ? config.character : 'battery',
      max_watt: Number(config.max_watt) || 3000,
      icon_size: Number(config.icon_size) || 160,
    };
    this._buildDOM();
  }

  // If entity_soc is configured, the mood is derived automatically from
  // its value against the three thresholds. Without entity_soc, the
  // manual mood_state dropdown acts as a fixed override — useful for
  // previewing a state or when no SOC sensor exists.
  _computeMood() {
    const c = this._config;
    if (c.entity_soc) {
      const soc = this._val(c.entity_soc);
      if (soc !== null) {
        if (soc <= c.threshold_empty_pct) return 'empty';
        if (soc <= c.threshold_weak_pct) return 'weak';
        if (soc <= c.threshold_full_pct) return 'normal';
        return 'full';
      }
    }
    return MOOD_STATES.includes(c.mood_state) ? c.mood_state : 'normal';
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
  @keyframes pf-droop { 0%,100% { transform:translateY(0) rotate(0deg); } 50% { transform:translateY(2px) rotate(1deg); } }
  @keyframes pf-breathe { 0%,100% { transform:scale(1,1); } 50% { transform:scale(1.035,1.035); } }
  @keyframes pf-shake { 0%,100% { transform:translateY(0) rotate(0deg); } 20% { transform:translateY(-2px) rotate(-2deg); } 40% { transform:translateY(0) rotate(2deg); } 60% { transform:translateY(-3px) rotate(-3deg); } 80% { transform:translateY(0) rotate(1deg); } }

  .pf-wobble-body { transform-origin:32px 42px; animation: pf-wobble var(--speed,6s) var(--comic-ease) infinite; }
  .pf-wobble-body.pf-mood-empty { animation: pf-droop 4s ease-in-out infinite; }
  .pf-wobble-body.pf-mood-full { animation: pf-breathe 3.5s ease-in-out infinite; }
  .pf-arms { transform-origin:32px 22px; animation: pf-lift var(--speed,6s) var(--comic-ease) infinite; }
  .pf-arms-weak { transform-origin:32px 22px; animation: pf-shake calc(var(--speed,6s) * 0.5) ease-in-out infinite; }
  .pf-eye { animation: pf-blink 4.4s ease-in-out infinite; }
  .pf-eye-r { animation-delay: 0.15s; }

  @media (prefers-reduced-motion: reduce) {
    .pf-wobble-body, .pf-wobble-body.pf-mood-empty, .pf-wobble-body.pf-mood-full, .pf-arms, .pf-arms-weak, .pf-eye { animation:none; }
  }
</style>
<ha-card>
  <div class="pf-title">${title} <span class="pf-version">· v${CARD_VERSION}</span></div>
  ${c.character === 'sun' ? charSunFull() : charBattery()}
  <div class="pf-value" id="val-battery">–</div>
  <div class="pf-debug" id="pf-debug">–</div>
</ha-card>
    `;
    this._startBlink();
    this._update();
  }

  // Blink cadence copied 1:1 from lutarym-pv-mood-card's _startBlink —
  // only has an effect while the sun character is selected (no-op
  // otherwise, since #sun-lid-l/#sun-lid-r won't exist in the DOM).
  _startBlink() {
    if (this._blinkTimer) clearInterval(this._blinkTimer);
    this._blinkTimer = setInterval(() => {
      if (this._config?.character !== 'sun') return;
      const lL = this.shadowRoot.getElementById('sun-lid-l');
      const lR = this.shadowRoot.getElementById('sun-lid-r');
      if (!lL || !lR) return;
      lL.setAttribute('height', '20'); lR.setAttribute('height', '20');
      setTimeout(() => { lL.setAttribute('height', '0'); lR.setAttribute('height', '0'); }, 110);
    }, 2800 + Math.random() * 2200);
  }

  disconnectedCallback() {
    if (this._blinkTimer) clearInterval(this._blinkTimer);
  }

  _update() {
    if (!this._config || !this._hass || !this.shadowRoot.querySelector('.pf-char')) return;
    const c = this._config;
    const dis = this._val(c.entity_discharge_power);
    const chg = this._val(c.entity_charge_power);
    const soc = this._val(c.entity_soc);
    const mood = this._computeMood();

    const speedBasis = Math.max(dis || 0, chg || 0);
    const charEl = this.shadowRoot.querySelector('.pf-char');
    if (charEl) charEl.style.setProperty('--speed', `${charDurationFor(speedBasis, c.max_watt)}s`);

    MOOD_STATES.forEach(m => {
      const el = this.shadowRoot.querySelector(`.pf-state-${m}`);
      if (el) el.style.display = (m === mood) ? '' : 'none';
    });
    const wobbleBody = this.shadowRoot.querySelector('.pf-wobble-body');
    if (wobbleBody) {
      wobbleBody.classList.toggle('pf-mood-empty', mood === 'empty');
      wobbleBody.classList.toggle('pf-mood-full', mood === 'full');
    }

    const socTxt = soc !== null ? `${Math.round(soc)}% · ` : '';
    let flowTxt = '–';
    if (dis !== null && dis > 0) flowTxt = `↑ ${this._fmt(dis)}`;
    else if (chg !== null && chg > 0) flowTxt = `↓ ${this._fmt(chg)}`;
    else if (dis !== null || chg !== null) flowTxt = '·';
    const val = this.shadowRoot.getElementById('val-battery');
    if (val) val.textContent = soc !== null || dis !== null || chg !== null ? `${socTxt}${flowTxt}` : '–';

    const dbg = this.shadowRoot.getElementById('pf-debug');
    if (dbg) dbg.textContent = `character=${c.character} dis=${dis} chg=${chg} soc=${soc} mood=${mood} speed=${charDurationFor(speedBasis, c.max_watt)}s`;
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
    const characterLabels = lang === 'de' ? CHARACTER_LABELS_DE : CHARACTER_LABELS_EN;

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
    form.appendChild(this._selectRow(
      lang === 'de' ? 'Charakter' : 'Character', 'character', cfg.character || 'battery', CHARACTERS, characterLabels));
    form.appendChild(this._toggleableEntityRow(
      lang === 'de' ? 'Entladeleistung-Entity' : 'Discharge power entity', 'entity_discharge_power', cfg.entity_discharge_power));
    form.appendChild(this._toggleableEntityRow(
      lang === 'de' ? 'Ladeleistung-Entity' : 'Charge power entity', 'entity_charge_power', cfg.entity_charge_power));
    form.appendChild(this._toggleableEntityRow(
      lang === 'de' ? 'Ladezustand-Entity (SOC, %)' : 'State of charge entity (%)', 'entity_soc', cfg.entity_soc));
    form.appendChild(this._selectRow(
      lang === 'de' ? 'Batterie-Zustand (manueller Override ohne SOC-Entity)' : 'Battery mood (manual override without SOC entity)',
      'mood_state', cfg.mood_state || 'normal', MOOD_STATES, moodLabels));
    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = lang === 'de'
      ? 'Wird nur verwendet, wenn keine Ladezustand-Entity gesetzt ist — sonst bestimmt der SOC-Wert den Zustand automatisch.'
      : 'Only used when no state-of-charge entity is set — otherwise the SOC value determines the mood automatically.';
    form.appendChild(hint);
    form.appendChild(this._numberRow(lang === 'de' ? 'Schwelle „leer" (%)' : 'Empty threshold (%)', 'threshold_empty_pct', cfg.threshold_empty_pct ?? 15));
    form.appendChild(this._numberRow(lang === 'de' ? 'Schwelle „wenig" (%)' : 'Weak threshold (%)', 'threshold_weak_pct', cfg.threshold_weak_pct ?? 40));
    form.appendChild(this._numberRow(lang === 'de' ? 'Schwelle „voll" (%)' : 'Full threshold (%)', 'threshold_full_pct', cfg.threshold_full_pct ?? 90));
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
