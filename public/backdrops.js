// Full-screen background effects drawn on the #backdrop canvas, picked by a
// theme's `backdrop` field. Each returns { start, stop }.

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
    start() {
      if (frame) return;
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

// Dark porphyry marble for Imperium: purple-black stone, soft mottling, and
// wandering pale veins with short branches. Static; redrawn only on resize.
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
    base.addColorStop(0, '#3b1433');
    base.addColorStop(0.6, '#1a0818');
    base.addColorStop(1, '#0c040b');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, width, height);

    // Mottling: large soft patches, slightly lighter or darker than the stone
    for (let i = 0; i < 70; i++) {
      const x = random() * width;
      const y = random() * height;
      const radius = size * (0.05 + random() * 0.18);
      const patch = ctx.createRadialGradient(x, y, 0, x, y, radius);
      patch.addColorStop(0, random() < 0.6 ? 'rgb(120 50 105 / 0.10)' : 'rgb(0 0 0 / 0.14)');
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
      ctx.strokeStyle = `rgb(236 214 190 / ${alpha})`;
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
      vein(x, y, heading, 90, step, 0.05, 10 * scale);
      ctx.filter = `blur(${0.6 * scale}px)`;
      const points = vein(x, y, heading, 90, step, strong ? 0.28 : 0.12, (strong ? 1.6 : 0.8) * scale);

      // A couple of short branches splitting off
      for (let b = 0; b < 3; b++) {
        const [bx, by] = points[Math.floor(random() * points.length)];
        vein(bx, by, heading + (random() < 0.5 ? -1 : 1) * (0.5 + random() * 0.6), 20, step * 0.8, 0.1, 0.6 * scale);
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

export const createBackdrops = (canvas) => ({
  rain: createRain(canvas),
  marble: createMarble(canvas),
});
