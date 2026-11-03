// Per-theme settings for everything drawn by script: the 3D wheel, sounds and
// fireworks. Page styling lives in styles.css under html[data-theme="<id>"].
// To add a theme, add an entry here and a matching block in styles.css.

export const DEFAULT_THEME = 'classic';

// Tick: a fast pitch drop, like a click. Fanfare: a rising major arpeggio.
const CLICK = { from: 1800, to: 500, duration: 0.04 };
const ARPEGGIO = { notes: [523.25, 659.25, 783.99, 1046.5], gap: 0.11, duration: 0.5 };

export const THEMES = {
  classic: {
    name: 'Classic',
    // Fixed segment colors, hand-shuffled so neighbors contrast. Repeats after 20.
    palette: [
      '#e63946', '#3a86ff', '#ffbe0b', '#8338ec', '#06d6a0',
      '#ff006e', '#80b918', '#118ab2', '#fb5607', '#9b5de5',
      '#fee440', '#2a9d8f', '#f15bb5', '#4361ee', '#f4a261',
      '#43aa8b', '#c1121f', '#00bbf9', '#ff7b00', '#7209b7',
    ],
    emptyColor: '#55506a',
    segment: { roughness: 0.55, glow: 0 },
    label: {
      font: (size) => `700 ${size}px system-ui, sans-serif`,
      fill: 'white',
      stroke: 'rgb(0 0 0 / 0.75)',
      glow: null,
    },
    metal: { color: 0xffc94a, metalness: 0.8, roughness: 0.3, emissive: 0x000000, glow: 0 },
    pointer: { color: 0xe0282e, emissive: 0x000000, glow: 0 },
    lights: { sky: 0xffffff, ground: 0x442266, hemisphere: 1, directional: 1.6, environment: 0.3, shadow: 0.35 },
    sound: { wave: 'triangle', volume: 1, tick: CLICK, fanfare: ARPEGGIO },
    fireworksHue: { min: 20, max: 60 },
    winnerLabel: 'The winner is',
  },

  matrix: {
    name: 'Matrix',
    // Phosphor greens, alternating dark and bright so neighbors stay distinct
    palette: [
      '#0b3d16', '#13802c', '#062a0e', '#1a9e38', '#0a4f1b',
      '#0f6b25', '#04220b', '#16913a', '#083312', '#127a2e',
      '#0d5a20', '#05290d', '#1a9e38', '#0b4519', '#10732a',
      '#072e10', '#158a33', '#09391a', '#0e6224', '#03200a',
    ],
    emptyColor: '#062a0e',
    segment: { roughness: 0.8, glow: 0.35 },
    label: {
      font: (size) => `${Math.round(size * 1.25)}px VT323, ui-monospace, monospace`,
      fill: '#b8ffc8',
      stroke: 'rgb(0 0 0 / 0.85)',
      glow: '#00ff41',
    },
    metal: { color: 0x00ff41, metalness: 0.2, roughness: 0.4, emissive: 0x00ff41, glow: 0.7 },
    pointer: { color: 0xffb000, emissive: 0xffb000, glow: 0.6 }, // amber, like the other classic terminal
    lights: { sky: 0xc8ffd0, ground: 0x001a06, hemisphere: 0.7, directional: 1.1, environment: 0.12, shadow: 0.5 },
    // Square waves sound much louder at equal gain
    sound: { wave: 'square', volume: 0.4, tick: CLICK, fanfare: ARPEGGIO },
    fireworksHue: { min: 100, max: 140 },
    winnerLabel: '> match found',
    fontsToLoad: ['64px VT323'],
    backdrop: 'rain', // backdrops.js
  },

  imperium: {
    name: 'Imperium',
    // Pompeii fresco pigments and Roman stones: red, ochre, lapis, terracotta,
    // black marble, olive, porphyry, verdigris. Mid-to-deep tones so ivory names
    // stay readable; warm and cool alternate so neighbors contrast.
    palette: [
      '#9e2b25', '#c8963e', '#2c4a6e', '#b5654a', '#3b3a3f',
      '#8a9a5b', '#6b2d4a', '#a88a5c', '#2f5d5a', '#c27c3a',
      '#7d1f1a', '#b89a62', '#24405e', '#9c5640', '#4a4950',
      '#76854c', '#5a2640', '#9a7d52', '#2a524f', '#b3702f',
    ],
    emptyColor: '#a88a5c',
    segment: { roughness: 0.55, glow: 0, texture: 'marble' }, // honed, veined stone; glossier washes colors out at this angle
    label: {
      font: (size) => `700 ${Math.round(size * 0.85)}px Cinzel, serif`,
      fill: '#f6e9c8',
      stroke: 'rgb(30 8 20 / 0.85)',
      glow: null,
    },
    metal: { color: 0xd4a017, metalness: 0.9, roughness: 0.25, emissive: 0x000000, glow: 0 },
    pointer: { color: 0xb06a2c, emissive: 0x000000, glow: 0, metalness: 0.8, roughness: 0.3 }, // bronze
    // Bright, slightly warm daylight with a pale stone bounce from below
    lights: { sky: 0xffffff, ground: 0x8a8070, color: 0xfff4e0, hemisphere: 1.3, directional: 1.8, environment: 0.3, shadow: 0.3 },
    // A lyre: soft plucks that ring a little, and an A-minor arpeggio
    sound: {
      wave: 'lyre',
      volume: 0.9,
      tick: { from: 1320, to: 1300, duration: 0.14 },
      fanfare: { notes: [440, 523.25, 659.25, 880, 1046.5], gap: 0.13, duration: 1.4 },
    },
    fireworksHue: { min: 35, max: 50 },
    winnerLabel: 'Ave',
    numerals: 'roman', // default names become I, II, III…
    backdrop: 'marble', // backdrops.js
    fontsToLoad: ['700 64px Cinzel'],
  },

  viking: {
    name: 'Viking',
    // Round-shield paints between bare planks: red, ochre, black, blue, bone
    palette: [
      '#8e1f1a', '#9a6b3c', '#1f3a5f', '#b8862b', '#1c1a18',
      '#a8956e', '#6e1814', '#5e3d22', '#2f4a2a', '#8a5a32',
      '#16304e', '#9c7a3a', '#2a2622', '#7a1f1f', '#94836a',
      '#704b2a', '#24402a', '#a0733f', '#5a1612', '#3a3a3f',
    ],
    emptyColor: '#3e2a1a',
    segment: { roughness: 0.85, glow: 0, texture: 'wood' },
    studs: true, // iron studs around the top rim
    boss: true, // domed iron shield boss instead of the flat hub
    runeRing: true, // Elder Futhark carved around the top face
    label: {
      font: (size) => `${Math.round(size * 0.95)}px MedievalSharp, serif`,
      fill: '#f3e2b8', // parchment
      stroke: 'rgb(20 10 4 / 0.9)',
      glow: null,
    },
    metal: { color: 0x4a4a52, metalness: 0.85, roughness: 0.45, emissive: 0x000000, glow: 0 }, // wrought iron
    pointer: { color: 0xa8adb8, emissive: 0x000000, glow: 0, metalness: 0.9, roughness: 0.25 }, // polished steel
    lights: {
      sky: 0xffb070, ground: 0x1a0d05, color: 0xffb36b, // warm firelight
      hemisphere: 0.6, directional: 1.6, environment: 0.1, shadow: 0.6,
      flicker: true,
    },
    // Wooden clacks, and a low war horn (sawtooth softened by a low-pass filter)
    sound: {
      wave: 'triangle',
      volume: 1.2,
      tick: { from: 700, to: 140, duration: 0.035 },
      fanfare: { notes: [110, 146.83, 220], gap: 0.4, duration: 1.8, wave: 'sawtooth', lowpass: 900, volume: 0.5 },
    },
    fireworksHue: { min: 10, max: 35 }, // embers
    winnerLabel: 'ᛏ Champion ᛏ', // Tiwaz, the rune of Týr, god of victory
    // Runes come from a unicode-range font, so name the characters to fetch
    fontsToLoad: ['64px MedievalSharp', ['48px "Noto Sans Runic"', 'ᚠᚢᚦᚨᚱᚲᛏ']],
    backdrop: 'runestones', // backdrops.js
  },
};
