// Full-screen background effects drawn on the #backdrop canvas, picked by a
// theme's `backdrop` field. Each returns { start({ animate }), stop }; with
// animate false (reduced motion) they draw a still frame, or nothing.

// "Digital rain" for Matrix: columns of glyphs falling, faded each frame so
// they leave trails. Kept dim and at ~20fps, since it only sits behind the wheel.
const GLYPHS = 'ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789';
const CELL = 18; // px per glyph
const FRAME_MS = 50;

const createRain = (canvas) => {
  const ctx = canvas.getContext('2d');
  let drops = []; // row of each column's head
  let frame = 0;
  let last = 0;

  const resize = () => {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    const rows = Math.ceil(canvas.height / CELL);
    drops = Array.from({ length: Math.ceil(canvas.width / CELL) }, () => -Math.floor(Math.random() * rows));
  };

  const draw = (time) => {
    frame = requestAnimationFrame(draw);
    if (time - last < FRAME_MS) return;
    last = time;

    ctx.fillStyle = 'rgb(0 0 0 / 0.12)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${CELL}px VT323, ui-monospace, monospace`;

    drops.forEach((row, column) => {
      const glyph = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      // Brighter head, the trail fades behind it
      ctx.fillStyle = Math.random() < 0.1 ? 'rgb(200 255 210 / 0.6)' : 'rgb(0 255 65 / 0.35)';
      ctx.fillText(glyph, column * CELL, row * CELL);
      // Restart at a random moment after leaving the screen, so columns drift apart
      drops[column] = row * CELL > canvas.height && Math.random() > 0.975 ? 0 : row + 1;
    });
  };

  return {
    start({ animate = true } = {}) {
      if (frame || !animate) return; // rain is all motion; the page stays black without it
      resize();
      addEventListener('resize', resize);
      frame = requestAnimationFrame(draw);
    },
    stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      removeEventListener('resize', resize);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
};

// Small seeded PRNG (mulberry32), so the marble looks the same on every load and resize
const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
};

// White Carrara-style marble for Imperium: pale stone with soft gray clouding
// and wandering gray veins with short branches. Static; redrawn only on resize.
const createMarble = (canvas) => {
  const ctx = canvas.getContext('2d');
  let resizeTimer;
  let running = false;

  const draw = () => {
    const scale = Math.min(devicePixelRatio, 2);
    const width = (canvas.width = Math.round(innerWidth * scale));
    const height = (canvas.height = Math.round(innerHeight * scale));
    const size = Math.max(width, height);
    const random = seeded(7);

    const base = ctx.createRadialGradient(width / 2, height * 0.35, 0, width / 2, height * 0.35, size * 0.75);
    base.addColorStop(0, '#f6f5f2');
    base.addColorStop(0.6, '#e8e6e1');
    base.addColorStop(1, '#cfccc6');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    // Clouding: large soft patches, slightly lighter or grayer than the stone
    for (let i = 0; i < 70; i++) {
      const x = random() * width;
      const y = random() * height;
      const radius = size * (0.05 + random() * 0.18);
      const patch = ctx.createRadialGradient(x, y, 0, x, y, radius);
      patch.addColorStop(0, random() < 0.5 ? 'rgb(255 255 255 / 0.35)' : 'rgb(110 110 118 / 0.07)');
      patch.addColorStop(1, 'rgb(0 0 0 / 0)');
      ctx.fillStyle = patch;
      ctx.fillRect(0, 0, width, height);
    }

    // A vein is a smoothed random walk drifting along a main direction
    const vein = (x, y, heading, steps, stepLength, alpha, lineWidth) => {
      const points = [[x, y]];
      const drift = heading;
      for (let i = 0; i < steps; i++) {
        heading += (random() - 0.5) * 0.28 + (drift - heading) * 0.04;
        x += Math.cos(heading) * stepLength;
        y += Math.sin(heading) * stepLength;
        points.push([x, y]);
      }
      ctx.strokeStyle = `rgb(88 88 96 / ${alpha})`;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(...points[0]);
      for (let i = 1; i < points.length - 1; i++) {
        const [px, py] = points[i];
        const [nx, ny] = points[i + 1];
        ctx.quadraticCurveTo(px, py, (px + nx) / 2, (py + ny) / 2);
      }
      ctx.stroke();
      return points;
    };

    ctx.lineCap = 'round';
    const step = size * 0.013;
    for (let i = 0; i < 15; i++) {
      const x = random() * width * 1.2 - width * 0.1;
      const y = random() * height * 1.2 - height * 0.1;
      const heading = Math.PI / 5 + (random() - 0.5) * 0.8;
      const strong = random() < 0.35;

      // Soft halo under the vein, then the vein itself
      ctx.filter = `blur(${6 * scale}px)`;
      vein(x, y, heading, 90, step, 0.06, 10 * scale);
      ctx.filter = `blur(${0.6 * scale}px)`;
      const points = vein(x, y, heading, 90, step, strong ? 0.38 : 0.16, (strong ? 1.6 : 0.8) * scale);

      // A couple of short branches splitting off
      for (let b = 0; b < 3; b++) {
        const [bx, by] = points[Math.floor(random() * points.length)];
        vein(bx, by, heading + (random() < 0.5 ? -1 : 1) * (0.5 + random() * 0.6), 20, step * 0.8, 0.14, 0.6 * scale);
      }
    }
    ctx.filter = 'none';
  };

  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(draw, 150);
  };

  return {
    start() {
      if (running) return;
      running = true;
      draw();
      addEventListener('resize', onResize);
    },
    stop() {
      running = false;
      clearTimeout(resizeTimer);
      removeEventListener('resize', onResize);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
};

// Firelit stone wall for Viking: rows of rough blocks, some carved with a rune,
// a warm glow from below that flickers in step-ish with the 3D firelight, and
// embers drifting up. The wall is drawn once per size; glow and embers each frame (~30fps).
const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';

const createRunestones = (canvas) => {
  const ctx = canvas.getContext('2d');
  const wall = document.createElement('canvas');
  const ember = document.createElement('canvas');
  let embers = [];
  let frame = 0;
  let last = 0;
  let running = false;
  let animated = false;
  let resizeTimer;
  let scale = 1;

  // Soft orange dot, drawn once and stamped for every ember
  ember.width = ember.height = 32;
  {
    const e = ember.getContext('2d');
    const glow = e.createRadialGradient(16, 16, 0, 16, 16, 16);
    glow.addColorStop(0, 'rgb(255 230 170 / 1)');
    glow.addColorStop(0.25, 'rgb(255 150 50 / 0.8)');
    glow.addColorStop(1, 'rgb(255 80 0 / 0)');
    e.fillStyle = glow;
    e.fillRect(0, 0, 32, 32);
  }

  const drawWall = () => {
    scale = Math.min(devicePixelRatio, 2);
    const width = (canvas.width = wall.width = Math.round(innerWidth * scale));
    const height = (canvas.height = wall.height = Math.round(innerHeight * scale));
    const w = wall.getContext('2d');
    const random = seeded(11);

    w.fillStyle = '#0b0806'; // mortar
    w.fillRect(0, 0, width, height);
    const rowHeight = Math.max(48 * scale, height / 12);
    const gap = 3 * scale;
    for (let y = -random() * rowHeight; y < height; y += rowHeight) {
      for (let x = -random() * rowHeight * 1.5; x < width; ) {
        const blockWidth = rowHeight * (1.3 + random() * 1.5);
        const light = 7 + random() * 7;
        const face = w.createLinearGradient(x, y, x + blockWidth, y + rowHeight);
        face.addColorStop(0, `hsl(${25 + random() * 15} ${8 + random() * 10}% ${light + 4}%)`);
        face.addColorStop(1, `hsl(${20 + random() * 15} ${6 + random() * 8}% ${light - 5}%)`);
        w.fillStyle = face;
        w.beginPath();
        w.roundRect(x + gap / 2, y + gap / 2, blockWidth - gap, rowHeight - gap, 5 * scale);
        w.fill();
        // Pitted surface
        for (let k = 0; k < 14; k++) {
          w.fillStyle = random() < 0.5 ? 'rgb(0 0 0 / 0.25)' : 'rgb(255 235 210 / 0.05)';
          w.beginPath();
          w.arc(x + random() * blockWidth, y + random() * rowHeight, (0.5 + random() * 2.5) * scale, 0, Math.PI * 2);
          w.fill();
        }
        // Now and then a rune cut into the block: dark groove, faint lit lower edge
        if (random() < 0.16) {
          const rune = [...RUNES][Math.floor(random() * RUNES.length)];
          const cx = x + blockWidth / 2;
          const cy = y + rowHeight / 2;
          w.font = `${Math.round(rowHeight * 0.6)}px "Noto Sans Runic", serif`;
          w.textAlign = 'center';
          w.textBaseline = 'middle';
          w.fillStyle = 'rgb(255 220 180 / 0.08)';
          w.fillText(rune, cx + scale, cy + 1.5 * scale);
          w.fillStyle = 'rgb(0 0 0 / 0.55)';
          w.fillText(rune, cx, cy);
        }
        x += blockWidth;
      }
    }

    // Darkness closing in at the edges
    const vignette = w.createRadialGradient(width / 2, height * 0.6, 0, width / 2, height * 0.6, Math.max(width, height) * 0.75);
    vignette.addColorStop(0, 'rgb(0 0 0 / 0)');
    vignette.addColorStop(0.45, 'rgb(0 0 0 / 0.45)');
    vignette.addColorStop(1, 'rgb(0 0 0 / 0.92)');
    w.fillStyle = vignette;
    w.fillRect(0, 0, width, height);
  };

  const paint = (seconds) => {
    const { width, height } = canvas;
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(wall, 0, 0);

    // Torch glow from below, flickering like the 3D lights
    const flicker = 1 + 0.12 * Math.sin(seconds * 7.3) + 0.07 * Math.sin(seconds * 13.7 + 1.3);
    const glow = ctx.createRadialGradient(width / 2, height, 0, width / 2, height, Math.max(width, height) * 0.8);
    glow.addColorStop(0, `rgb(255 130 40 / ${0.34 * flicker})`);
    glow.addColorStop(1, 'rgb(255 100 20 / 0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);

    for (const e of embers) {
      const size = e.size * scale;
      ctx.globalAlpha = Math.max(0, e.life) * (0.6 + 0.4 * Math.sin(seconds * 20 + e.x));
      ctx.drawImage(ember, e.x - size / 2, e.y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
  };

  const spawn = (anywhere) => ({
    x: canvas.width * (0.15 + Math.random() * 0.7),
    y: anywhere ? Math.random() * canvas.height : canvas.height + 10,
    speed: (0.6 + Math.random() * 1.4) * scale,
    sway: Math.random() * Math.PI * 2,
    life: 0.6 + Math.random() * 0.4,
    size: 6 + Math.random() * 10,
  });

  const tick = (time) => {
    frame = requestAnimationFrame(tick);
    if (time - last < 33) return;
    last = time;
    for (const e of embers) {
      e.y -= e.speed;
      e.x += Math.sin(time / 600 + e.sway) * 0.6 * scale;
      e.life -= 0.004;
    }
    embers = embers.filter((e) => e.life > 0 && e.y > -20);
    while (embers.length < 50) embers.push(spawn(false));
    paint(time / 1000);
  };

  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      drawWall();
      if (!animated) paint(0);
    }, 150);
  };

  return {
    start({ animate = true } = {}) {
      if (running) return;
      running = true;
      animated = animate;
      drawWall();
      addEventListener('resize', onResize);
      if (animate) {
        embers = Array.from({ length: 50 }, () => spawn(true));
        frame = requestAnimationFrame(tick);
      } else {
        embers = [];
        paint(0);
      }
    },
    stop() {
      running = false;
      cancelAnimationFrame(frame);
      frame = 0;
      clearTimeout(resizeTimer);
      removeEventListener('resize', onResize);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
};

// Desert for Desert: hot sky with the sun, pyramids on the horizon, layered
// dunes, and sand grains blown across on the wind. The scene is drawn once
// per size; the sand is animated (~30fps).
const createDunes = (canvas) => {
  const ctx = canvas.getContext('2d');
  const scene = document.createElement('canvas');
  let grains = [];
  let frame = 0;
  let last = 0;
  let running = false;
  let animated = false;
  let resizeTimer;
  let scale = 1;

  const drawScene = () => {
    scale = Math.min(devicePixelRatio, 2);
    const width = (canvas.width = scene.width = Math.round(innerWidth * scale));
    const height = (canvas.height = scene.height = Math.round(innerHeight * scale));
    const s = scene.getContext('2d');
    const random = seeded(23);
    const horizon = height * 0.5;

    const sky = s.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#f3dc9a');
    sky.addColorStop(1, '#f0b862');
    s.fillStyle = sky;
    s.fillRect(0, 0, width, height);

    // Sun: white-hot core and a wide glow
    const sunX = width * 0.8;
    const sunY = height * 0.18;
    const sunRadius = Math.max(width, height) * 0.05;
    const sun = s.createRadialGradient(sunX, sunY, 0, sunX, sunY, sunRadius * 6);
    sun.addColorStop(0, 'rgb(255 252 235 / 1)');
    sun.addColorStop(0.16, 'rgb(255 245 205 / 0.95)');
    sun.addColorStop(0.2, 'rgb(255 230 160 / 0.45)');
    sun.addColorStop(1, 'rgb(255 210 120 / 0)');
    s.fillStyle = sun;
    s.fillRect(0, 0, width, horizon * 1.2);

    // Pyramids on the horizon, hazy with distance: lit face and shaded face
    for (const [x, size] of [[0.12, 0.16], [0.24, 0.1], [0.7, 0.13], [0.79, 0.07]]) {
      const base = width * size;
      const peakX = width * x;
      const peakY = horizon - base * 0.62;
      s.fillStyle = '#e6b36c';
      s.beginPath();
      s.moveTo(peakX - base / 2, horizon);
      s.lineTo(peakX, peakY);
      s.lineTo(peakX + base * 0.12, horizon);
      s.fill();
      s.fillStyle = '#cf9a55';
      s.beginPath();
      s.moveTo(peakX + base * 0.12, horizon);
      s.lineTo(peakX, peakY);
      s.lineTo(peakX + base / 2, horizon);
      s.fill();
    }

    // Dunes: back to front, each a smooth ridge, lighter on top, darker in its trough
    const layers = [
      { top: 0.5, height: 0.06, light: '#ecbf72', dark: '#dda35a' },
      { top: 0.58, height: 0.08, light: '#e8b566', dark: '#d2944c' },
      { top: 0.7, height: 0.1, light: '#e2aa59', dark: '#c78640' },
      { top: 0.84, height: 0.12, light: '#d99d4c', dark: '#b87536' },
    ];
    for (const layer of layers) {
      const phase = random() * Math.PI * 2;
      const wavelength = width * (0.35 + random() * 0.3);
      const ridge = (x) =>
        height * (layer.top - layer.height * (0.5 + 0.35 * Math.sin(x / wavelength * Math.PI * 2 + phase) + 0.15 * Math.sin(x / wavelength * 7 + phase * 2)));
      const fill = s.createLinearGradient(0, height * (layer.top - layer.height), 0, height);
      fill.addColorStop(0, layer.light);
      fill.addColorStop(0.35, layer.dark);
      fill.addColorStop(1, layer.dark);
      s.fillStyle = fill;
      s.beginPath();
      s.moveTo(0, height);
      for (let x = 0; x <= width; x += 8 * scale) s.lineTo(x, ridge(x));
      s.lineTo(width, height);
      s.fill();
      // Sunlit crest: a soft sheen, not a hard line
      s.strokeStyle = 'rgb(255 240 200 / 0.22)';
      s.lineWidth = 5 * scale;
      s.filter = `blur(${3 * scale}px)`;
      s.beginPath();
      s.moveTo(0, ridge(0));
      for (let x = 8 * scale; x <= width; x += 8 * scale) s.lineTo(x, ridge(x));
      s.stroke();
      s.filter = 'none';
    }

    // Heat and distance: soften toward the edges
    const vignette = s.createRadialGradient(width / 2, height * 0.5, 0, width / 2, height * 0.5, Math.max(width, height) * 0.8);
    vignette.addColorStop(0.6, 'rgb(120 60 20 / 0)');
    vignette.addColorStop(1, 'rgb(120 60 20 / 0.3)');
    s.fillStyle = vignette;
    s.fillRect(0, 0, width, height);
  };

  const paint = () => {
    ctx.drawImage(scene, 0, 0);
    for (const g of grains) {
      ctx.fillStyle = `rgb(255 244 215 / ${g.alpha})`;
      ctx.fillRect(g.x, g.y, g.length, scale);
    }
  };

  const spawn = (anywhere) => ({
    x: anywhere ? Math.random() * canvas.width : -20,
    y: canvas.height * (0.45 + Math.random() * 0.55),
    speed: (3 + Math.random() * 6) * scale,
    length: (2 + Math.random() * 6) * scale, // streaks: grains move faster than the frame
    alpha: 0.2 + Math.random() * 0.4,
    wobble: Math.random() * Math.PI * 2,
  });

  const tick = (time) => {
    frame = requestAnimationFrame(tick);
    if (time - last < 33) return;
    last = time;
    for (const g of grains) {
      g.x += g.speed;
      g.y += Math.sin(time / 300 + g.wobble) * 0.4 * scale;
    }
    grains = grains.filter((g) => g.x < canvas.width + 20);
    while (grains.length < 140) grains.push(spawn(false));
    paint();
  };

  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      drawScene();
      if (!animated) paint();
    }, 150);
  };

  return {
    start({ animate = true } = {}) {
      if (running) return;
      running = true;
      animated = animate;
      drawScene();
      addEventListener('resize', onResize);
      grains = animate ? Array.from({ length: 140 }, () => spawn(true)) : [];
      if (animate) frame = requestAnimationFrame(tick);
      else paint();
    },
    stop() {
      running = false;
      cancelAnimationFrame(frame);
      frame = 0;
      clearTimeout(resizeTimer);
      removeEventListener('resize', onResize);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
};

// Workshop for Steampunk: big brass gears turning slowly in the gloom, copper
// pipes in front with valves that vent puffs of steam. Background and pipes
// are cached per size; gears and steam are drawn each frame (~30fps).
const GEARS = [
  // x, y as fractions of the screen; radius as a fraction of the short side
  { x: 0.08, y: 0.28, radius: 0.24, teeth: 18 },
  { x: 0.29, y: 0.06, radius: 0.13, teeth: 10 },
  { x: 0.93, y: 0.32, radius: 0.27, teeth: 20 },
  { x: 0.77, y: 0.07, radius: 0.11, teeth: 9 },
  { x: 0.14, y: 0.9, radius: 0.19, teeth: 15 },
  { x: 0.87, y: 0.86, radius: 0.17, teeth: 14 },
  { x: 0.6, y: 1.02, radius: 0.12, teeth: 9 },
];

const gearPath = (radius, teeth) => {
  const path = new Path2D();
  const steps = teeth * 4;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const r = i % 4 < 2 ? radius : radius * 0.88;
    if (i === 0) path.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else path.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  // Axle hole and five spoke windows, cut out with the even-odd rule
  path.moveTo(radius * 0.16, 0);
  path.arc(0, 0, radius * 0.16, 0, Math.PI * 2);
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2;
    const cx = Math.cos(a) * radius * 0.52;
    const cy = Math.sin(a) * radius * 0.52;
    path.moveTo(cx + radius * 0.2, cy);
    path.arc(cx, cy, radius * 0.2, 0, Math.PI * 2);
  }
  return path;
};

const createGears = (canvas) => {
  const ctx = canvas.getContext('2d');
  const back = document.createElement('canvas');
  const front = document.createElement('canvas');
  let gears = [];
  let puffs = [];
  let valves = [];
  let frame = 0;
  let last = 0;
  let running = false;
  let animated = false;
  let resizeTimer;
  let scale = 1;

  const layout = () => {
    scale = Math.min(devicePixelRatio, 2);
    const width = (canvas.width = back.width = front.width = Math.round(innerWidth * scale));
    const height = (canvas.height = back.height = front.height = Math.round(innerHeight * scale));
    const short = Math.min(width, height);

    // Gears alternate direction, and smaller ones turn faster, as if meshed
    gears = GEARS.map((g, i) => ({
      x: g.x * width,
      y: g.y * height,
      radius: g.radius * short,
      path: gearPath(g.radius * short, g.teeth),
      speed: (i % 2 ? -1 : 1) * (0.05 / g.radius) * 0.02,
    }));

    const b = back.getContext('2d');
    const wall = b.createRadialGradient(width / 2, height * 0.45, 0, width / 2, height * 0.45, Math.max(width, height) * 0.8);
    wall.addColorStop(0, '#2c2118');
    wall.addColorStop(0.6, '#1a130d');
    wall.addColorStop(1, '#0a0705');
    b.fillStyle = wall;
    b.fillRect(0, 0, width, height);

    // Copper pipes: one along the bottom, one up the right side, flanged joints
    const f = front.getContext('2d');
    f.clearRect(0, 0, width, height);
    const pipe = 14 * scale;
    const copper = (x0, y0, x1, y1) => {
      const grad = x0 === x1 ? f.createLinearGradient(x0 - pipe, 0, x0 + pipe, 0) : f.createLinearGradient(0, y0 - pipe, 0, y0 + pipe);
      grad.addColorStop(0, '#4a2510');
      grad.addColorStop(0.35, '#c47a42');
      grad.addColorStop(0.5, '#e8a56a');
      grad.addColorStop(1, '#3a1c0c');
      f.fillStyle = grad;
      if (x0 === x1) f.fillRect(x0 - pipe, y0, pipe * 2, y1 - y0);
      else f.fillRect(x0, y0 - pipe, x1 - x0, pipe * 2);
    };
    const pipeY = height * 0.955;
    const pipeX = width * 0.975;
    copper(0, pipeY, pipeX + pipe, pipeY);
    copper(pipeX, 0, pipeX, pipeY + pipe);
    f.fillStyle = '#6b4a22';
    valves = [];
    for (let i = 1; i < 6; i++) {
      const x = (i / 6) * pipeX;
      f.fillRect(x - pipe * 0.6, pipeY - pipe * 1.35, pipe * 1.2, pipe * 2.7);
      if (i % 2) valves.push({ x, y: pipeY - pipe * 1.35 });
    }
    for (let i = 1; i < 4; i++) f.fillRect(pipeX - pipe * 1.35, (i / 4) * pipeY - pipe * 0.6, pipe * 2.7, pipe * 1.2);

    const vignette = f.createRadialGradient(width / 2, height * 0.45, 0, width / 2, height * 0.45, Math.max(width, height) * 0.75);
    vignette.addColorStop(0.55, 'rgb(0 0 0 / 0)');
    vignette.addColorStop(1, 'rgb(0 0 0 / 0.6)');
    f.fillStyle = vignette;
    f.fillRect(0, 0, width, height);
  };

  const paint = (seconds) => {
    ctx.drawImage(back, 0, 0);
    for (const g of gears) {
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(seconds * g.speed * 60);
      const brass = ctx.createLinearGradient(-g.radius, -g.radius, g.radius, g.radius);
      brass.addColorStop(0, 'rgb(150 110 50 / 0.5)');
      brass.addColorStop(1, 'rgb(80 55 25 / 0.5)');
      ctx.fillStyle = brass;
      ctx.fill(g.path, 'evenodd');
      ctx.strokeStyle = 'rgb(20 12 5 / 0.6)';
      ctx.lineWidth = 2 * scale;
      ctx.stroke(g.path);
      ctx.restore();
    }
    for (const p of puffs) {
      const puff = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
      // Soft falloff all the way out, so puffs read as vapor rather than discs
      puff.addColorStop(0, `rgb(240 235 225 / ${0.09 * p.life})`);
      puff.addColorStop(0.4, `rgb(240 235 225 / ${0.04 * p.life})`);
      puff.addColorStop(1, 'rgb(240 235 225 / 0)');
      ctx.fillStyle = puff;
      ctx.fillRect(p.x - p.radius, p.y - p.radius, p.radius * 2, p.radius * 2);
    }
    ctx.drawImage(front, 0, 0);
  };

  const tick = (time) => {
    frame = requestAnimationFrame(tick);
    if (time - last < 33) return;
    last = time;
    // Now and then a valve vents a burst of steam
    if (valves.length && Math.random() < 0.06) {
      const valve = valves[Math.floor(Math.random() * valves.length)];
      // Several faint puffs that spread apart, so overlaps stay soft instead of stacking into a ball
      for (let i = 0; i < 6; i++) {
        puffs.push({
          x: valve.x + (Math.random() - 0.5) * 16 * scale,
          y: valve.y,
          radius: (12 + Math.random() * 14) * scale,
          life: 1,
          rise: (1.5 + Math.random() * 2) * scale,
          drift: (Math.random() - 0.5) * 1.6 * scale,
        });
      }
    }
    for (const p of puffs) {
      p.y -= p.rise;
      p.x += p.drift;
      p.radius += 1.6 * scale;
      p.life -= 0.014;
    }
    puffs = puffs.filter((p) => p.life > 0);
    paint(time / 1000);
  };

  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      layout();
      if (!animated) paint(0);
    }, 150);
  };

  return {
    start({ animate = true } = {}) {
      if (running) return;
      running = true;
      animated = animate;
      layout();
      addEventListener('resize', onResize);
      puffs = [];
      if (animate) frame = requestAnimationFrame(tick);
      else paint(0);
    },
    stop() {
      running = false;
      cancelAnimationFrame(frame);
      frame = 0;
      clearTimeout(resizeTimer);
      removeEventListener('resize', onResize);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
};

// Outrun scene for Synthwave: starry violet sky, a striped sunset sun, neon
// mountains, and a magenta perspective grid scrolling toward the viewer. The sky
// is cached per size; the grid is drawn each frame (~30fps).
const createOutrun = (canvas) => {
  const ctx = canvas.getContext('2d');
  const sky = document.createElement('canvas');
  let frame = 0;
  let last = 0;
  let running = false;
  let animated = false;
  let resizeTimer;
  let scale = 1;
  let horizon = 0;

  const drawSky = () => {
    scale = Math.min(devicePixelRatio, 2);
    const width = (canvas.width = sky.width = Math.round(innerWidth * scale));
    const height = (canvas.height = sky.height = Math.round(innerHeight * scale));
    const s = sky.getContext('2d');
    const random = seeded(31);
    horizon = height * 0.62;

    const air = s.createLinearGradient(0, 0, 0, horizon);
    air.addColorStop(0, '#0d0221');
    air.addColorStop(0.55, '#2a0a4a');
    air.addColorStop(1, '#8a1b6b');
    s.fillStyle = air;
    s.fillRect(0, 0, width, horizon);

    for (let i = 0; i < 160; i++) {
      s.fillStyle = `rgb(255 230 255 / ${0.2 + random() * 0.7})`;
      const size = (random() < 0.9 ? 1 : 2) * scale;
      s.fillRect(random() * width, random() * horizon * 0.8, size, size);
    }

    // Sun: yellow to pink to violet, its lower half sliced by widening gaps.
    // Off to the right, since the wheel would hide a centered one.
    const radius = Math.min(width, height) * 0.22;
    const cx = width * 0.8;
    const cy = horizon - radius * 0.45;
    const sun = document.createElement('canvas');
    sun.width = sun.height = Math.ceil(radius * 2);
    const sctx = sun.getContext('2d');
    const glow = sctx.createLinearGradient(0, 0, 0, radius * 2);
    glow.addColorStop(0, '#ffd319');
    glow.addColorStop(0.5, '#ff2975');
    glow.addColorStop(1, '#8c1eff');
    sctx.fillStyle = glow;
    sctx.beginPath();
    sctx.arc(radius, radius, radius, 0, Math.PI * 2);
    sctx.fill();
    sctx.globalCompositeOperation = 'destination-out';
    for (let k = 0; k < 7; k++) {
      const y = radius * (1.05 + k * 0.14);
      sctx.fillRect(0, y, radius * 2, radius * (0.02 + k * 0.012));
    }
    s.save();
    s.shadowColor = '#ff2975';
    s.shadowBlur = 60 * scale;
    s.drawImage(sun, cx - radius, cy - radius);
    s.restore();

    // Mountains either side: dark violet, rimmed in neon pink
    s.fillStyle = '#1a0630';
    s.strokeStyle = '#ff2a6d';
    s.lineWidth = 2 * scale;
    s.shadowColor = '#ff2a6d';
    s.shadowBlur = 10 * scale;
    for (const side of [0, 1]) {
      s.beginPath();
      const from = side ? width * 0.62 : 0;
      const to = side ? width : width * 0.38;
      s.moveTo(from, horizon);
      for (let x = from; x <= to; x += width * 0.03) {
        s.lineTo(x, horizon - random() * height * 0.12 * (side ? (x - from) / (to - from) : (to - x) / (to - from)));
      }
      s.lineTo(to, horizon);
      s.closePath();
      s.fill();
      s.stroke();
    }
    s.shadowBlur = 0;
  };

  const paint = (seconds) => {
    const { width, height } = canvas;
    ctx.drawImage(sky, 0, 0);

    const floor = ctx.createLinearGradient(0, horizon, 0, height);
    floor.addColorStop(0, '#2a0845');
    floor.addColorStop(1, '#07010f');
    ctx.fillStyle = floor;
    ctx.fillRect(0, horizon, width, height - horizon);

    ctx.save();
    ctx.strokeStyle = 'rgb(255 42 109 / 0.85)';
    ctx.shadowColor = '#ff2a6d';
    ctx.shadowBlur = 8 * scale;
    ctx.lineWidth = 1.5 * scale;
    ctx.beginPath();
    // Depth lines: at distance z a line sits at horizon + depth / z; scrolling
    // z by the phase moves them toward the viewer, looping seamlessly
    const depth = height - horizon;
    const phase = (seconds * 0.6) % 1;
    for (let k = 1; k < 40; k++) {
      const z = k - phase;
      if (z < 1) continue;
      const y = horizon + depth / z;
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    // Rails converging on the vanishing point at the horizon's center
    for (let k = -20; k <= 20; k++) {
      ctx.moveTo(width / 2 + k * width * 0.02, horizon);
      ctx.lineTo(width / 2 + k * width * 0.18, height);
    }
    ctx.stroke();
    ctx.restore();

    // Hot line along the horizon
    const line = ctx.createLinearGradient(0, 0, width, 0);
    line.addColorStop(0, 'rgb(255 42 109 / 0)');
    line.addColorStop(0.5, 'rgb(255 150 220 / 0.9)');
    line.addColorStop(1, 'rgb(255 42 109 / 0)');
    ctx.fillStyle = line;
    ctx.fillRect(0, horizon - scale, width, 2 * scale);
  };

  const tick = (time) => {
    frame = requestAnimationFrame(tick);
    if (time - last < 33) return;
    last = time;
    paint(time / 1000);
  };

  const onResize = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      drawSky();
      if (!animated) paint(0);
    }, 150);
  };

  return {
    start({ animate = true } = {}) {
      if (running) return;
      running = true;
      animated = animate;
      drawSky();
      addEventListener('resize', onResize);
      if (animate) frame = requestAnimationFrame(tick);
      else paint(0);
    },
    stop() {
      running = false;
      cancelAnimationFrame(frame);
      frame = 0;
      clearTimeout(resizeTimer);
      removeEventListener('resize', onResize);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    },
  };
};

export const createBackdrops = (canvas) => ({
  rain: createRain(canvas),
  marble: createMarble(canvas),
  runestones: createRunestones(canvas),
  dunes: createDunes(canvas),
  gears: createGears(canvas),
  outrun: createOutrun(canvas),
});
