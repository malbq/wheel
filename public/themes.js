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
    hub: 'axis', // glowing pole through the center instead of a hub disc
    label: {
      font: (size) => `${Math.round(size * 1.25)}px VT323, ui-monospace, monospace`,
      fill: '#b8ffc8',
      stroke: 'rgb(0 0 0 / 0.85)',
      glow: '#00ff41',
    },
    metal: { color: 0x00ff41, metalness: 0.2, roughness: 0.4, emissive: 0x00ff41, glow: 0.7 },
    pointer: { shape: 'crystal', color: 0xffb000, emissive: 0xffb000, glow: 0.6 }, // amber, like the other classic terminal
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
    hub: 'laurel', // gold coin in a laurel wreath
    label: {
      font: (size) => `700 ${Math.round(size * 0.85)}px Cinzel, serif`,
      fill: '#f6e9c8',
      stroke: 'rgb(30 8 20 / 0.85)',
      glow: null,
    },
    metal: { color: 0xd4a017, metalness: 0.9, roughness: 0.25, emissive: 0x000000, glow: 0 },
    pointer: { shape: 'spear', color: 0xd08a45, emissive: 0x000000, glow: 0, metalness: 0.75, roughness: 0.35, accent: 0x8a5f2e }, // bronze head, wooden shaft
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
    hub: 'boss', // domed iron shield boss instead of the flat hub
    // Elder Futhark carved around the top face
    glyphRing: { glyphs: 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ', font: '"Noto Sans Runic"' },
    label: {
      font: (size) => `${Math.round(size * 0.95)}px MedievalSharp, serif`,
      fill: '#f3e2b8', // parchment
      stroke: 'rgb(20 10 4 / 0.9)',
      glow: null,
    },
    metal: { color: 0x4a4a52, metalness: 0.85, roughness: 0.45, emissive: 0x000000, glow: 0 }, // wrought iron
    pointer: { shape: 'horn', color: 0xa8adb8, emissive: 0x000000, glow: 0, metalness: 0.9, roughness: 0.25, accent: 0xefe4cc }, // steel fittings, ivory horn
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

  desert: {
    name: 'Desert',
    // Sand and gold, with the pigments of Egyptian tomb painting and jewelry:
    // lapis, turquoise faience, carnelian, malachite, kohl black
    palette: [
      '#d4a84a', '#1f4e8c', '#c98b2b', '#2a8a80', '#b98a4e',
      '#a8402a', '#e0b860', '#2a2420', '#c4954a', '#3e7d4f',
      '#d9ae52', '#173a6b', '#b77a2e', '#1e756d', '#caa065',
      '#8f3520', '#d6a845', '#3a2f28', '#bf8f45', '#356b44',
    ],
    emptyColor: '#c4954a',
    segment: { roughness: 0.8, glow: 0, texture: 'sandstone' },
    hub: 'pyramid', // gold pyramid in the middle
    // Hieroglyphs carved around the face: ankh, eye of Horus, scarab, sun, owl, cobra, djed…
    glyphRing: { glyphs: '𓋹𓂀𓆣𓇳𓅓𓆓𓊽𓄿𓈖𓃭𓇋𓋴𓀭𓁟𓊪𓃀', font: '"Noto Sans Egyptian Hieroglyphs"' },
    label: {
      font: (size) => `${Math.round(size * 0.9)}px Marcellus, serif`,
      fill: '#fff6dc',
      stroke: 'rgb(40 25 8 / 0.85)',
      glow: null,
    },
    metal: { color: 0xd4a84a, metalness: 0.9, roughness: 0.25, emissive: 0x000000, glow: 0 }, // gold
    pointer: { shape: 'ankh', color: 0x1f4e8c, emissive: 0x000000, glow: 0, metalness: 0.4, roughness: 0.3 }, // lapis inlay in gold
    // Hard desert sun with a warm sand bounce
    lights: { sky: 0xfff4d6, ground: 0xc89a5a, color: 0xfff0c8, hemisphere: 1.2, directional: 2, environment: 0.25, shadow: 0.4 },
    // A dry sistrum jingle, and a reed-like run up the hijaz scale
    sound: {
      wave: 'triangle',
      volume: 0.9,
      tick: { from: 2400, to: 1900, duration: 0.05 },
      fanfare: { notes: [293.66, 311.13, 369.99, 392, 440, 587.33], gap: 0.13, duration: 0.6, wave: 'sawtooth', lowpass: 1800, volume: 0.3 },
    },
    fireworksHue: { min: 40, max: 55 }, // gold
    winnerLabel: '𓋹 Chosen of Ra 𓋹',
    // Hieroglyphs come from a unicode-range font, so name the characters to fetch
    fontsToLoad: ['64px Marcellus', ['48px "Noto Sans Egyptian Hieroglyphs"', '𓋹𓂀𓆣𓇳𓅓𓆓𓊽𓄿𓈖𓃭𓇋𓋴𓀭𓁟𓊪𓃀']],
    backdrop: 'dunes', // backdrops.js
  },

  steampunk: {
    name: 'Steampunk',
    // Brass, copper, bronze and gunmetal between verdigris patina and oxblood leather
    palette: [
      '#b5893a', '#2f6b62', '#b87333', '#5a1e1a', '#8c6a3a',
      '#3d3a36', '#c9a050', '#3f7f73', '#9a5a2c', '#6e2a22',
      '#a8823e', '#2b5650', '#c07a3e', '#4a1915', '#7d5e34',
      '#2e2c2a', '#bf9548', '#356f66', '#8f4f26', '#622620',
    ],
    emptyColor: '#3d3a36',
    segment: { roughness: 0.4, metalness: 0.6, glow: 0, texture: 'brushed' },
    hub: 'gear', // brass cog with lightening holes
    studs: true, // brass rivets around the top rim
    pointerGear: true, // small gear at the pointer pivot, turning with the wheel
    label: {
      font: (size) => `${Math.round(size * 0.85)}px Rye, serif`,
      fill: '#f6e7c4',
      stroke: 'rgb(30 15 5 / 0.9)',
      glow: null,
    },
    metal: { color: 0xb5893a, metalness: 0.95, roughness: 0.32, emissive: 0x000000, glow: 0 }, // brass
    pointer: { shape: 'cone', color: 0xb87333, emissive: 0x000000, glow: 0, metalness: 0.95, roughness: 0.28 }, // copper
    // Warm gaslight; a stronger environment so the metals have something to reflect
    lights: { sky: 0xffe8c0, ground: 0x2a1a0a, color: 0xffd9a0, hemisphere: 0.8, directional: 1.8, environment: 0.55, shadow: 0.5 },
    // Clockwork ticks, and a steam whistle: a chord sounded together, sliding up as pressure builds
    sound: {
      wave: 'square',
      volume: 0.5,
      tick: { from: 1500, to: 700, duration: 0.018 },
      fanfare: { notes: [523.25, 659.25, 783.99], gap: 0, duration: 1.4, glide: 1.04, wave: 'sawtooth', lowpass: 2600, volume: 0.45 },
    },
    fireworksHue: { min: 25, max: 45 }, // copper and brass sparks
    winnerLabel: 'Eureka!',
    fontsToLoad: ['64px Rye'],
    backdrop: 'gears', // backdrops.js
  },

  synthwave: {
    name: 'Synthwave',
    // Neon pink, cyan, violet and electric blue, each next to near-black so the glow pops
    palette: [
      '#ff2a6d', '#1a0b2e', '#05d9e8', '#2b0f4a', '#b14aed',
      '#120626', '#ff6ec7', '#1e0b3a', '#2d6bff', '#160a2c',
      '#d300c5', '#24103f', '#00f0ff', '#1a0b2e', '#ff3864',
      '#2b0f4a', '#7b2cff', '#120626', '#ff9ef0', '#1e0b3a',
    ],
    emptyColor: '#2b0f4a',
    segment: { roughness: 0.3, metalness: 0.2, glow: 0.3 },
    hub: 'record', // vinyl record with a glowing label
    label: {
      font: (size) => `700 ${Math.round(size * 0.8)}px Orbitron, sans-serif`,
      fill: '#ffffff',
      stroke: 'rgb(20 0 30 / 0.85)',
      glow: '#ff2a6d',
    },
    metal: { color: 0x05d9e8, metalness: 0.3, roughness: 0.3, emissive: 0x05d9e8, glow: 0.9 }, // neon tubes
    pointer: { shape: 'triangle', color: 0xff2a6d, emissive: 0xff2a6d, glow: 0.7, metalness: 0.3, roughness: 0.3 },
    lights: { sky: 0xff6ec7, ground: 0x1a0b2e, color: 0xb0e0ff, hemisphere: 0.6, directional: 1.2, environment: 0.3, shadow: 0.5 },
    // Synth blips, and a filtered sawtooth arpeggio up A minor
    sound: {
      wave: 'square',
      volume: 0.35,
      tick: { from: 1200, to: 2400, duration: 0.03 },
      fanfare: { notes: [220, 261.63, 329.63, 392, 493.88, 659.25], gap: 0.09, duration: 0.8, wave: 'sawtooth', lowpass: 2200, volume: 1 },
    },
    fireworksHue: { min: 280, max: 330 }, // magenta and violet
    winnerLabel: 'High Score',
    fontsToLoad: ['700 64px Orbitron'],
    backdrop: 'outrun', // backdrops.js
  },
};
