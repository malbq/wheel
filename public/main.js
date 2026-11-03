import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Fireworks } from 'fireworks-js';
import { createNamesEditor, formatLine } from './names.js';
import { DEFAULT_THEME, THEMES } from './themes.js';
import { createBackdrops } from './backdrops.js';

const TAU = Math.PI * 2;
const STORAGE_NAMES = 'wheelNames';
const STORAGE_MUTED = 'wheelMuted';
const STORAGE_COLLAPSED = 'wheelNamesCollapsed';
const STORAGE_THEME = 'wheelTheme';
const STORAGE_THEMES_COLLAPSED = 'wheelThemesCollapsed';

const WHEEL_RADIUS = 8;
const WHEEL_THICKNESS = 2;
const PEG_RISE = 0.4;
const IDLE_SPEED = 0.12; // rad/s
const FRUSTUM = 20;

// The inline script in index.html sets data-theme and collapse classes on <html> before first paint
const root = document.documentElement;
let theme = THEMES[root.dataset.theme] ?? THEMES[DEFAULT_THEME];

const segmentColor = (i, count) => {
  const { palette } = theme;
  // When the palette wraps exactly, the last segment would match the first one it touches
  const last = count > 1 && i === count - 1 && i % palette.length === 0;
  return palette[(i + (last ? 1 : 0)) % palette.length];
};

const $ = (id) => document.getElementById(id);
const normalize = (angle) => ((angle % TAU) + TAU) % TAU;
const random = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

// Scene

const canvas = $('scene');
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment()).texture;

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 1000);
camera.position.set(70, 30, 0);
camera.lookAt(0, 0, 0);

const hemisphere = new THREE.HemisphereLight();
scene.add(hemisphere);

const light = new THREE.DirectionalLight(0xffffff);
light.position.set(4, 12, 6);
light.castShadow = true;
light.shadow.mapSize.set(2048, 2048);
Object.assign(light.shadow.camera, { near: 1, far: 60, left: -15, right: 15, top: 15, bottom: -15 });
light.shadow.radius = 4;
scene.add(light);

const floorMaterial = new THREE.ShadowMaterial();
const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -WHEEL_THICKNESS / 2 - 1.2;
floor.receiveShadow = true;
scene.add(floor);

// Shared by rings, pegs, hub and the pointer cap; restyled in place on theme change
const metal = new THREE.MeshStandardMaterial();
const pointerMaterial = new THREE.MeshStandardMaterial({ metalness: 0.3, roughness: 0.35 });

// Torchlight: a few out-of-step sine waves make an irregular, never-repeating-looking flicker
const flickerTorchlight = (seconds) => {
  const { lights } = theme;
  const f = 1 + 0.1 * Math.sin(seconds * 7.3) + 0.06 * Math.sin(seconds * 13.7 + 1.3) + 0.04 * Math.sin(seconds * 23.1 + 2.1);
  light.intensity = lights.directional * f;
  hemisphere.intensity = lights.hemisphere * (0.5 + f / 2);
};

const applySceneTheme = () => {
  const { lights, metal: m, pointer: p } = theme;
  hemisphere.color.set(lights.sky);
  hemisphere.groundColor.set(lights.ground);
  hemisphere.intensity = lights.hemisphere;
  light.intensity = lights.directional;
  light.color.set(lights.color ?? 0xffffff);
  scene.environmentIntensity = lights.environment;
  floorMaterial.opacity = lights.shadow;
  metal.color.set(m.color);
  metal.metalness = m.metalness;
  metal.roughness = m.roughness;
  metal.emissive.set(m.emissive);
  metal.emissiveIntensity = m.glow;
  pointerMaterial.color.set(p.color);
  pointerMaterial.emissive.set(p.emissive);
  pointerMaterial.emissiveIntensity = p.glow;
  pointerMaterial.metalness = p.metalness ?? 0.3;
  pointerMaterial.roughness = p.roughness ?? 0.35;
};

// Segment surface textures, tinted by each segment's color (map × color).
// Each is drawn once on first use and shared. Bases are mid-gray so details
// can come out lighter than the surface as well as darker. Extruded caps get
// UVs in world units, hence the small repeat.
const segmentTextures = {};

const makeTexture = (draw) => {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d'), size, (max = size) => Math.random() * max);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1 / 12, 1 / 12);
  return texture;
};

const TEXTURE_PAINTERS = {
  // Soft cloudy mottling, then wobbly veins drifting diagonally, mostly light.
  // The texture is sRGB, so a #c4 base would darken colors to ~55%; keep it near white.
  marble: (ctx, size, r) => {
    ctx.fillStyle = '#e8e8e8';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 40; i++) {
      const x = r();
      const y = r();
      const blotch = ctx.createRadialGradient(x, y, 0, x, y, 40 + r(120));
      blotch.addColorStop(0, Math.random() < 0.5 ? 'rgb(255 255 255 / 0.12)' : 'rgb(0 0 0 / 0.08)');
      blotch.addColorStop(1, 'rgb(0 0 0 / 0)');
      ctx.fillStyle = blotch;
      ctx.fillRect(0, 0, size, size);
    }
    ctx.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const light = i % 4 !== 0;
      ctx.strokeStyle = light ? `rgb(255 255 255 / ${0.5 + r(0.5)})` : `rgb(40 30 30 / ${0.2 + r(0.2)})`;
      ctx.lineWidth = 0.8 + r(light ? 2.6 : 1.2);
      ctx.filter = `blur(${0.4 + r(1)}px)`;
      let x = r();
      let y = r();
      let heading = Math.PI / 4 + (Math.random() - 0.5);
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let step = 0; step < 60; step++) {
        heading += (Math.random() - 0.5) * 0.6;
        x += Math.cos(heading) * 8;
        y += Math.sin(heading) * 8;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  },

  // Planks: long wavy grain lines along x, a few knots with rings bent around them
  wood: (ctx, size, r) => {
    ctx.fillStyle = '#c8c8c8';
    ctx.fillRect(0, 0, size, size);
    const knots = Array.from({ length: 3 }, () => ({ x: r(), y: r(), radius: 10 + r(14) }));
    for (let y = 0; y < size; y += 2 + r(5)) {
      const dark = Math.random() < 0.6;
      ctx.strokeStyle = dark ? `rgb(40 25 15 / ${0.08 + r(0.22)})` : `rgb(255 245 230 / ${0.06 + r(0.12)})`;
      ctx.lineWidth = 0.6 + r(2);
      const phase = r(Math.PI * 2);
      ctx.beginPath();
      for (let x = 0; x <= size; x += 8) {
        // Grain swells around knots
        let bend = Math.sin(x / 60 + phase) * 2;
        for (const knot of knots) {
          const d = Math.hypot(x - knot.x, y - knot.y);
          if (d < knot.radius * 4) bend += Math.sign(y - knot.y || 1) * (knot.radius * 4 - d) * 0.25;
        }
        if (x === 0) ctx.moveTo(x, y + bend);
        else ctx.lineTo(x, y + bend);
      }
      ctx.stroke();
    }
    for (const knot of knots) {
      for (let ring = knot.radius; ring > 2; ring -= 3) {
        ctx.strokeStyle = 'rgb(50 30 15 / 0.35)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(knot.x, knot.y, ring * 1.8, ring, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  },
};

// Elder Futhark carved in a ring on the wheel's top face, just inside the
// studs: a transparent disc laid over the segments. Each rune is drawn twice,
// a dark groove and a faint lit edge, so it reads as cut into the wood.
const FUTHARK = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';

const makeRuneRing = () => {
  const size = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const center = size / 2;
  const radius = center * ((WHEEL_RADIUS - 0.95) / WHEEL_RADIUS); // texture spans the whole disc
  const count = FUTHARK.length * 2;
  ctx.font = `${Math.round(size * 0.042)}px "Noto Sans Runic", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * TAU;
    ctx.save();
    ctx.translate(center + Math.cos(angle) * radius, center + Math.sin(angle) * radius);
    ctx.rotate(angle + Math.PI / 2); // upright, reading around the rim
    const rune = [...FUTHARK][i % FUTHARK.length];
    ctx.fillStyle = 'rgb(255 225 180 / 0.22)';
    ctx.fillText(rune, 2.5, 2.5);
    ctx.fillStyle = 'rgb(14 6 2 / 0.85)';
    ctx.fillText(rune, 0, 0);
    ctx.restore();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(WHEEL_RADIUS, 96),
    new THREE.MeshStandardMaterial({ map: texture, transparent: true, roughness: 0.9, depthWrite: false })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = WHEEL_THICKNESS / 2 + 0.005;
  disc.receiveShadow = true;
  return disc;
};

const getSegmentTexture = (kind) => {
  if (!kind) return null;
  segmentTextures[kind] ??= makeTexture(TEXTURE_PAINTERS[kind]);
  return segmentTextures[kind];
};
const isSharedTexture = (texture) => Object.values(segmentTextures).includes(texture);
applySceneTheme();

// Wheel

const wheel = new THREE.Group();
scene.add(wheel);
let hasPegs = false;

const disposeChildren = (group) => {
  group.traverse((object) => {
    object.geometry?.dispose();
    if (object.material && object.material !== metal) {
      if (!isSharedTexture(object.material.map)) object.material.map?.dispose();
      object.material.dispose();
    }
  });
  group.clear();
};

const makeLabelTexture = (text, aspect) => {
  const height = 128;
  const width = Math.min(2048, Math.round(height * aspect));
  const label = document.createElement('canvas');
  label.width = width;
  label.height = height;
  const ctx = label.getContext('2d');
  const { font, fill, stroke, glow } = theme.label;
  const maxWidth = width * 0.9;

  // Shrink to fit, then truncate if still too long
  let size = 80;
  ctx.font = font(size);
  while (ctx.measureText(text).width > maxWidth && size > 48) {
    ctx.font = font(--size);
  }
  let shown = text;
  while (ctx.measureText(shown).width > maxWidth && shown.length > 1) {
    shown = shown.slice(0, -2) + '…';
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = size / 8;
  ctx.strokeStyle = stroke;
  ctx.strokeText(shown, width / 2, height / 2);
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = size / 4;
  }
  ctx.fillStyle = fill;
  ctx.fillText(shown, width / 2, height / 2);

  const texture = new THREE.CanvasTexture(label);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
};

const buildWheel = (names, colors) => {
  disposeChildren(wheel);

  const count = names.length;
  const segmentAngle = TAU / count;
  const curveSegments = Math.max(2, Math.ceil(256 / count));
  // Cap the label arc so names on huge segments don't wrap half the wheel
  const labelArc = Math.min(segmentAngle, Math.PI / 2);
  const labelHeight = WHEEL_THICKNESS * 0.6;
  const labelRadius = WHEEL_RADIUS * 1.002;
  const showPegs = count > 1 && count <= 80;
  hasPegs = showPegs;

  names.forEach((name, i) => {
    const start = i * segmentAngle;
    const mid = start + segmentAngle / 2;

    // Rotating -90° about X maps shape (cos a, sin a) to world (cos a, 0, -sin a)
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.absarc(0, 0, WHEEL_RADIUS, start, start + segmentAngle, false);
    shape.lineTo(0, 0);
    const segment = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: WHEEL_THICKNESS, bevelEnabled: false, curveSegments }),
      new THREE.MeshStandardMaterial({
        color: colors[i],
        map: getSegmentTexture(theme.segment.texture),
        roughness: theme.segment.roughness,
        emissive: colors[i],
        emissiveIntensity: theme.segment.glow,
      })
    );
    segment.rotation.x = -Math.PI / 2;
    segment.position.y = -WHEEL_THICKNESS / 2;
    segment.castShadow = true;
    segment.receiveShadow = true;
    wheel.add(segment);

    // Open cylinder slice hugging the rim. Cylinder vertices sit at (sin θ, cos θ),
    // so θ = a + π/2 matches our (cos a, -sin a) convention and U runs with a.
    const label = new THREE.Mesh(
      new THREE.CylinderGeometry(
        labelRadius, labelRadius, labelHeight,
        Math.max(8, Math.ceil(labelArc * 24)), 1, true,
        mid - labelArc / 2 + Math.PI / 2, labelArc
      ),
      new THREE.MeshBasicMaterial({
        map: makeLabelTexture(name, (labelRadius * labelArc) / labelHeight),
        transparent: true,
      })
    );
    wheel.add(label);

    if (showPegs) {
      // Spans the rim and pokes above the top face, where the pointer catches it
      const peg = new THREE.Mesh(new THREE.BoxGeometry(0.22, WHEEL_THICKNESS + PEG_RISE, 0.07), metal);
      peg.position.set(Math.cos(start) * WHEEL_RADIUS, PEG_RISE / 2, -Math.sin(start) * WHEEL_RADIUS);
      peg.rotation.y = start;
      peg.castShadow = true;
      wheel.add(peg);
    }
  });

  for (const y of [-WHEEL_THICKNESS / 2, WHEEL_THICKNESS / 2]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(WHEEL_RADIUS, 0.09, 12, 160), metal);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = y;
    ring.castShadow = true;
    wheel.add(ring);
  }

  if (theme.boss) {
    // Shield boss: a low iron dome
    const boss = new THREE.Mesh(new THREE.SphereGeometry(1.4, 40, 16, 0, TAU, 0, Math.PI / 2), metal);
    boss.scale.y = 0.55;
    boss.position.y = WHEEL_THICKNESS / 2;
    boss.castShadow = true;
    wheel.add(boss);
  } else {
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.4, 48), metal);
    hub.position.y = WHEEL_THICKNESS / 2 + 0.2;
    hub.castShadow = true;
    wheel.add(hub);
  }

  if (theme.runeRing) wheel.add(makeRuneRing());

  // Iron-bound look: domed studs evenly around the top rim, independent of segments
  if (theme.studs) {
    const stud = new THREE.SphereGeometry(0.13, 12, 6, 0, TAU, 0, Math.PI / 2);
    for (let i = 0; i < 36; i++) {
      const angle = (i / 36) * TAU;
      const mesh = new THREE.Mesh(stud, metal);
      mesh.position.set(Math.cos(angle) * (WHEEL_RADIUS - 0.35), WHEEL_THICKNESS / 2, -Math.sin(angle) * (WHEEL_RADIUS - 0.35));
      mesh.castShadow = true;
      wheel.add(mesh);
    }
  }
};

// Pointer: hangs over the front rim, pivoting at its top. Its tip dips below
// the peg tops, so each passing peg pushes it aside until the tip rides over
// the peg and snaps back. That release is when the tick plays.
//
// A peg at world angle ψ sits at z = -R·sin ψ (ψ grows as the wheel spins).
// While touching, the tip rests CONTACT_GAP past it: L·sin(swing) = CONTACT_GAP + R·sin ψ.

const PEG_TOP = WHEEL_THICKNESS / 2 + PEG_RISE;
const POINTER_LENGTH = 1.8; // pivot to tip
const POINTER_DIP = 0.15; // how far the resting tip sits below the peg tops
const POINTER_PIVOT = PEG_TOP - POINTER_DIP + POINTER_LENGTH;
const CONTACT_GAP = 0.12; // peg half-thickness plus tip radius near the tip
const CONTACT_ANGLE = Math.asin(CONTACT_GAP / WHEEL_RADIUS); // peg is this far before the pointer at first touch
const RELEASE_SWING = Math.acos((POINTER_PIVOT - PEG_TOP) / POINTER_LENGTH); // swing where the tip clears the peg
const RELEASE_ANGLE = Math.asin((POINTER_LENGTH * Math.sin(RELEASE_SWING) - CONTACT_GAP) / WHEEL_RADIUS);

const pointer = new THREE.Group();
pointer.position.set(WHEEL_RADIUS - 0.05, POINTER_PIVOT, 0);
const pointerTip = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.6, 32), pointerMaterial);
pointerTip.rotation.z = Math.PI; // tip points down at the rim
pointerTip.position.y = 0.8 - POINTER_LENGTH;
pointerTip.castShadow = true;
const pointerCap = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 16), metal);
pointerCap.castShadow = true;
pointer.add(pointerTip, pointerCap);
scene.add(pointer);

// Sound

let audio;
let master; // all sound goes through here; muting sets its gain to 0
let tickBus; // pending ticks of the current spin, so a cancelled spin can drop them
let muted = localStorage.getItem(STORAGE_MUTED) === '1';

const MIN_TICK_GAP = 12; // ms; faster ticks blur into a buzz anyway
const DISPLAY_DELAY = 20; // ms from a frame's timestamp until it's on screen (about one frame plus rounding)

const applyMute = () => master?.gain.setTargetAtTime(muted ? 0 : 1, audio.currentTime, 0.01);

const ensureAudio = () => {
  if (!audio) {
    audio = new AudioContext();
    master = audio.createGain();
    master.connect(audio.destination);
    applyMute();
  }
  return audio.state === 'suspended' ? audio.resume() : Promise.resolve();
};

// A plucked-string tone: strong fundamental, quickly fading overtones
let lyreWave;
const LYRE_HARMONICS = [0, 1, 0.55, 0.3, 0.18, 0.1, 0.05];

// One decaying tone. `voice` is a theme's tick or fanfare settings, which can
// override the theme's waveform and volume and add a low-pass filter (to
// soften harsh waves into something horn-like).
const beep = (freq, start, duration, voice, { endFreq = freq, destination = master } = {}) => {
  const { wave = theme.sound.wave, volume = 1, lowpass } = voice;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  if (wave === 'lyre') {
    lyreWave ??= audio.createPeriodicWave(LYRE_HARMONICS.map(() => 0), LYRE_HARMONICS);
    osc.setPeriodicWave(lyreWave);
  } else {
    osc.type = wave;
  }
  osc.frequency.setValueAtTime(freq, start);
  osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration);
  gain.gain.setValueAtTime(0.12 * volume * theme.sound.volume, start);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  let output = osc;
  if (lowpass) {
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    output = osc.connect(filter);
  }
  output.connect(gain).connect(destination);
  osc.start(start);
  osc.stop(start + duration);
};

const canPlay = () => !muted && audio?.state === 'running';

// Convert a performance.now() time to the audio clock so a sound scheduled
// there leaves the speakers at that moment, output latency included
const audioTimeAt = (time) => {
  const stamp = audio.getOutputTimestamp?.();
  if (stamp?.performanceTime) return stamp.contextTime + (time - stamp.performanceTime) / 1000;
  return audio.currentTime + (time - performance.now()) / 1000 - (audio.outputLatency || audio.baseLatency || 0);
};

const stopTicks = () => {
  tickBus?.disconnect();
  tickBus = null;
};

// Ticks are scheduled up front on the audio clock rather than played from the
// render loop, so they aren't rounded to frames or dropped at high speed.
// Scheduled even when muted, so unmuting mid-spin works.
const scheduleTicks = (times) => {
  stopTicks();
  tickBus = audio.createGain();
  tickBus.connect(master);
  const now = performance.now();
  const { tick } = theme.sound;
  for (const time of times) {
    if (time < now) continue;
    const start = Math.max(audio.currentTime, audioTimeAt(time + DISPLAY_DELAY));
    beep(tick.from, start, tick.duration, tick, { endFreq: tick.to, destination: tickBus });
  }
};

const playFanfare = () => {
  if (!canPlay()) return;
  const t = audio.currentTime;
  const { fanfare } = theme.sound;
  fanfare.notes.forEach((freq, i) => beep(freq, t + i * fanfare.gap, fanfare.duration, fanfare));
};

// Names

const namesInput = $('namesList');
const namesCount = $('namesCount');
let names = []; // labels on the wheel, in segment order
let entries = []; // wheel segments: { name, slot, slots, line } where line is the textarea line, or -1 for defaults

const DEFAULT_COUNT = 10;

const toRoman = (n) =>
  [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']].reduce((out, [value, numeral]) => {
    for (; n >= value; n -= value) out += numeral;
    return out;
  }, '');

// Default entries are numbered at build time, so a theme can restyle them (I, II, III…)
const defaultLabel = (n) => (theme.numerals === 'roman' ? toRoman(n) : String(n));

let debounce;
const editor = createNamesEditor({
  textarea: namesInput,
  backdrop: $('namesBackdrop'),
  gutter: $('namesGutter'),
  colorOf: segmentColor,
  onInput: () => {
    clearTimeout(debounce);
    debounce = setTimeout(applyNames, 250);
  },
});

// Named lines from the textarea, with their line index
const listedNames = () =>
  editor.lines.map((line, index) => ({ ...line, line: index })).filter((line) => line.name);

// Colors follow position among all listed names (removed included), same as
// the gutter. The slot is kept so a theme change can recolor in place.
const withSlots = (list) => list.map((entry, slot) => ({ ...entry, slot, slots: list.length }));

const rebuildWheel = () => {
  if (entries.length) {
    names = entries.map((entry) => (entry.line < 0 ? defaultLabel(entry.slot + 1) : entry.name));
    buildWheel(names, entries.map((entry) => segmentColor(entry.slot, entry.slots)));
  } else {
    names = ['All names removed'];
    buildWheel(names, [theme.emptyColor]);
  }
};

const applyNames = () => {
  clearTimeout(debounce);
  localStorage.setItem(STORAGE_NAMES, namesInput.value.trim());

  const listed = withSlots(listedNames());
  entries = listed.length
    ? listed.filter((entry) => entry.enabled)
    : withSlots(Array.from({ length: DEFAULT_COUNT }, () => ({ line: -1 })));
  const enabled = entries.length;
  namesCount.textContent = enabled < listed.length ? `${enabled} / ${listed.length}` : enabled;

  rebuildWheel();
  hideWinner();
  state = 'idle';
  spinButton.disabled = !enabled;
  stopTicks(); // in case this cancelled a spin
};

// Shuffle and sort keep disabled names, and drop blank lines
const rewriteNames = (reorder) => {
  const listed = listedNames();
  if (!listed.length) return;
  editor.setLines(reorder(listed).map((entry) => formatLine(entry.name, entry.enabled)));
  applyNames();
};

$('shuffleButton').addEventListener('click', () => rewriteNames((list) => {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}));

$('sortButton').addEventListener('click', () => rewriteNames((list) =>
  list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
));

if (/Mac|iPhone|iPad/.test(navigator.userAgent)) $('toggleKey').textContent = '⌘';

// Collapse

const namesToggle = $('namesToggle');

const setCollapsed = (collapsed) => {
  root.classList.toggle('names-collapsed', collapsed);
  $('namesContent').inert = collapsed; // keep hidden controls out of tab order
  namesToggle.setAttribute('aria-expanded', String(!collapsed));
  namesToggle.title = collapsed ? 'Expand names' : 'Collapse names';
  localStorage.setItem(STORAGE_COLLAPSED, collapsed ? '1' : '0');
};

namesToggle.addEventListener('click', () => setCollapsed(!root.classList.contains('names-collapsed')));
setCollapsed(root.classList.contains('names-collapsed'));

// Spin

let state = 'idle'; // idle | spinning | stopped
let spin; // { from, delta, start, duration }
let swing = 0; // pointer angle; positive bends the tip toward -Z, the way the front rim moves
let swingVelocity = 0;

const spinButton = $('spinButton');
const easeOut = (t) => 1 - (1 - t) ** 4;
const easeOutInverse = (progress) => 1 - (1 - progress) ** 0.25;

// Ticks happen when a peg releases the pointer. Without pegs, when a segment boundary passes it.
const tickAngle = () => (hasPegs ? RELEASE_ANGLE : 0);

// The spin path is known up front, so solve for every moment a peg reaches the
// tick angle: peg k is at k·a + θ, so it happens whenever θ ≡ tickAngle (mod a)
const tickTimes = ({ from, delta, start, duration }) => {
  if (names.length < 2) return [];
  const a = TAU / names.length;
  const times = [];
  let last = -Infinity;
  for (let theta = from + (normalize(tickAngle() - from) % a || a); theta <= from + delta; theta += a) {
    const time = start + easeOutInverse((theta - from) / delta) * duration;
    if (time - last < MIN_TICK_GAP) continue;
    times.push(time);
    last = time;
  }
  return times;
};

const SWING_FREQUENCY = 35; // rad/s, spring back to rest
const SWING_DAMPING = 0.3;

const updatePointer = (dt) => {
  let pushed = 0;
  if (hasPegs) {
    // The next peg yet to release the pointer, and its angle
    const psi = RELEASE_ANGLE - (normalize(RELEASE_ANGLE - wheel.rotation.y) % (TAU / names.length));
    if (psi > -CONTACT_ANGLE) {
      pushed = Math.asin(Math.min(1, (CONTACT_GAP + WHEEL_RADIUS * Math.sin(psi)) / POINTER_LENGTH));
    }
  }

  if (pushed >= swing) {
    swing = pushed;
    swingVelocity = 0;
  } else {
    // Damped spring back toward rest once the peg lets go. Small fixed steps
    // keep it stable when a slow frame brings a large dt.
    const steps = Math.ceil(dt / 0.004);
    for (let i = 0; i < steps; i++) {
      const acceleration = -(SWING_FREQUENCY ** 2) * swing - 2 * SWING_DAMPING * SWING_FREQUENCY * swingVelocity;
      swingVelocity += (acceleration * dt) / steps;
      swing += (swingVelocity * dt) / steps;
    }
  }
  pointer.rotation.x = swing;
};

// Label i sits at local angle mid_i; after rotating by θ it is at mid_i + θ.
// The pointer is at angle 0, so the index under it is floor(normalize(-θ) / segment).
const indexAt = (rotation) => Math.floor(normalize(-rotation) / (TAU / names.length)) % names.length;

const startSpin = () => {
  if (state === 'spinning') return;
  hideWinner();

  const segmentAngle = TAU / names.length;
  const target = Math.floor(random() * names.length);
  // Land clear of the pegs' contact zone, so the pointer rests straight inside
  // the winning segment. The segment's starting peg is offset·a before the
  // pointer, its ending peg (1 - offset)·a past it.
  const margin = 0.02;
  const minOffset = Math.max(0.15, (CONTACT_ANGLE + margin) / segmentAngle);
  const maxOffset = Math.min(0.85, 1 - (RELEASE_ANGLE + margin) / segmentAngle);
  const offset = minOffset < maxOffset ? minOffset + random() * (maxOffset - minOffset) : 0.5;
  const finalAngle = normalize(-(target + offset) * segmentAngle);
  const turns = 5 + Math.floor(random() * 4);
  const from = wheel.rotation.y;

  const current = (spin = {
    from,
    delta: normalize(finalAngle - from) + turns * TAU,
    start: performance.now(),
    duration: 6000 + random() * 3000,
  });
  state = 'spinning';
  spinButton.disabled = true;

  // The first spin may have to wait for the audio context to start
  ensureAudio().then(() => {
    if (spin === current && state === 'spinning') scheduleTicks(tickTimes(current));
  });
};

const finishSpin = () => {
  state = 'stopped';
  spinButton.disabled = false;
  showWinner(indexAt(wheel.rotation.y));
};

spinButton.addEventListener('click', startSpin);

// Winner

const winnerCard = document.querySelector('.winner-card');
const winnerName = $('winnerName');
let winnerIndex = -1;

const fireworks = new Fireworks($('fireworks'), {
  autoresize: true,
  opacity: 0.8,
  acceleration: 1.05,
  friction: 0.97,
  gravity: 1.5,
  particles: 150,
  traceLength: 3,
  traceSpeed: 10,
  explosion: 8,
  intensity: 30,
  flickering: 50,
  lineStyle: 'round',
  hue: theme.fireworksHue,
  delay: { min: 15, max: 30 },
  rocketsPoint: { min: 50, max: 50 },
  lineWidth: { explosion: { min: 1, max: 3 }, trace: { min: 1, max: 2 } },
  brightness: { min: 50, max: 80 },
  decay: { min: 0.015, max: 0.03 },
  mouse: { click: false, move: false, max: 1 },
});
let fireworksTimer;
let fireworksStopping = false;

// Graceful stop: waitStop() stops launching rockets but lets the ones in the
// air explode and fade, then stops. Calling it again mid-wind-down would stack
// a second frame loop, hence the flag.
const stopFireworks = () => {
  clearTimeout(fireworksTimer);
  if (!fireworks.isRunning || fireworksStopping) return;
  fireworksStopping = true;
  fireworks.waitStop().then(() => (fireworksStopping = false));
};

const startFireworks = () => {
  if (fireworksStopping) {
    // Still winding down from the last show: start() would be a no-op and the
    // pending stop would end this one. Cancel it (waitStopRaf is a public field
    // in fireworks-js 2.x) so launches resume without clearing what's on screen.
    fireworks.waitStopRaf = null;
    fireworksStopping = false;
  }
  fireworks.start();
  clearTimeout(fireworksTimer);
  fireworksTimer = setTimeout(stopFireworks, 8000);
};

const showWinner = (index) => {
  winnerIndex = index;
  winnerName.textContent = names[index];
  // Default numbered names aren't in the textarea, so there's nothing to disable
  removeWinnerButton.hidden = entries[index]?.line < 0;
  winnerCard.hidden = false;
  playFanfare();
  if (!reducedMotion.matches) startFireworks();
};

function hideWinner() {
  winnerCard.hidden = true;
  winnerIndex = -1;
  stopFireworks();
}

// Dismissing the result returns to the initial state, with the wheel idling
const closeWinner = () => {
  hideWinner();
  if (state === 'stopped') state = 'idle';
};

$('closeWinnerButton').addEventListener('click', closeWinner);

const removeWinnerButton = $('removeWinnerButton');
removeWinnerButton.addEventListener('click', () => {
  const line = entries[winnerIndex]?.line ?? -1;
  if (line < 0) return closeWinner();
  editor.setEnabled(line, line, false);
  applyNames(); // also resets to idle
});

addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeWinner();
});

// Sound toggle

const muteButton = $('muteButton');
const muteIcon = $('muteIcon');
const renderMute = () => {
  muteIcon.textContent = muted ? '🔇' : '🔊';
  muteButton.setAttribute('aria-pressed', String(muted));
};
const toggleMute = () => {
  muted = !muted;
  localStorage.setItem(STORAGE_MUTED, muted ? '1' : '0');
  if (!muted) ensureAudio();
  applyMute();
  renderMute();
};
muteButton.addEventListener('click', toggleMute);
renderMute();

// Keyboard shortcuts

const shortcuts = {
  Space: { button: spinButton, run: startSpin },
  KeyS: { button: muteButton, run: toggleMute },
};

// Briefly sink the button's keycap so the shortcut gives visual feedback
const flashPressed = (button) => {
  button.classList.add('is-pressed');
  setTimeout(() => button.classList.remove('is-pressed'), 120);
};

addEventListener('keydown', (event) => {
  const shortcut = shortcuts[event.code];
  if (!shortcut || event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
  if (event.target.closest('textarea, input, summary')) return;
  // Space on a focused button already clicks it
  if (event.code === 'Space' && event.target.closest('button')) return;
  event.preventDefault();
  if (shortcut.button.disabled) return;
  flashPressed(shortcut.button);
  shortcut.run();
});

// Themes

const backdrops = createBackdrops($('backdrop'));
const themeList = $('themeList');
const themesToggle = $('themesToggle');

const applyTheme = async (requested) => {
  const id = THEMES[requested] ? requested : DEFAULT_THEME;
  const target = THEMES[id];
  theme = target;
  root.dataset.theme = id; // page styling switches right away
  localStorage.setItem(STORAGE_THEME, id);
  themeList.querySelectorAll('button').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.themeId === id));
  });

  // Wheel labels are drawn into canvases, so their font must be loaded first
  // An entry can be [font, sample text] for fonts split by unicode-range
  await Promise.all((target.fontsToLoad ?? []).map((font) => document.fonts.load(...[font].flat())));
  if (theme !== target) return; // another theme was picked meanwhile

  applySceneTheme();
  rebuildWheel(); // keeps rotation and spin state
  editor.render(); // gutter colors, and textarea height for the new font
  fireworks.updateOptions({ hue: target.fireworksHue });
  $('winnerLabel').textContent = target.winnerLabel;
  for (const [name, backdrop] of Object.entries(backdrops)) {
    if (name !== target.backdrop) backdrop.stop();
  }
  if (target.backdrop) backdrops[target.backdrop].start({ animate: !reducedMotion.matches });
};

for (const [id, { name, palette }] of Object.entries(THEMES)) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'theme-option';
  button.dataset.themeId = id; // not data-theme, which the theme CSS keys on
  const swatch = document.createElement('span');
  swatch.className = 'swatch';
  swatch.style.background = `conic-gradient(${palette.slice(0, 4).join(', ')})`;
  button.append(swatch, name);
  button.addEventListener('click', () => applyTheme(id));
  themeList.append(button);
}

const setThemesCollapsed = (collapsed) => {
  root.classList.toggle('themes-collapsed', collapsed);
  themeList.inert = collapsed;
  themesToggle.setAttribute('aria-expanded', String(!collapsed));
  localStorage.setItem(STORAGE_THEMES_COLLAPSED, collapsed ? '1' : '0');
};

themesToggle.addEventListener('click', () => setThemesCollapsed(!root.classList.contains('themes-collapsed')));
setThemesCollapsed(root.classList.contains('themes-collapsed'));

// Layout

const resize = () => {
  const { innerWidth: width, innerHeight: height } = window;
  const aspect = width / height;
  // Keep the whole wheel visible on portrait screens
  const frustum = Math.max(FRUSTUM, 23 / aspect);
  camera.left = (-frustum * aspect) / 2;
  camera.right = (frustum * aspect) / 2;
  camera.top = frustum / 2;
  camera.bottom = -frustum / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
};
addEventListener('resize', resize);
resize();

// Loop

let lastTime = performance.now();

renderer.setAnimationLoop((time) => {
  const dt = Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;

  if (state === 'spinning') {
    const t = Math.min((time - spin.start) / spin.duration, 1);
    wheel.rotation.y = spin.from + spin.delta * easeOut(t);
    if (t === 1) {
      wheel.rotation.y = normalize(wheel.rotation.y);
      finishSpin();
    }
  } else if (state === 'idle' && !reducedMotion.matches) {
    wheel.rotation.y = normalize(wheel.rotation.y + IDLE_SPEED * dt);
  }

  updatePointer(dt);
  if (theme.lights.flicker && !reducedMotion.matches) flickerTorchlight(time / 1000);
  renderer.render(scene, camera);
});

// Init

namesInput.value = localStorage.getItem(STORAGE_NAMES) ?? '';
editor.render();
applyNames();
applyTheme(root.dataset.theme);
