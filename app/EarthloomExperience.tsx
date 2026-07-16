"use client";

import { useEffect, useRef, useState } from "react";
import type { EarthloomSnapshot } from "./types";

interface Props {
  snapshot: EarthloomSnapshot;
}

function randomFactory(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

type GeoPoint = readonly [latitude: number, longitude: number];

const landMasses: readonly (readonly GeoPoint[])[] = [
  [
    [37, -17], [36, 0], [32, 12], [33, 28], [27, 34], [14, 43], [2, 42], [-11, 40],
    [-23, 35], [-35, 20], [-34, 8], [-25, 2], [-15, -8], [0, -17], [13, -17], [22, -16], [32, -10],
  ],
  [
    [36, -10], [43, -9], [51, -5], [58, 5], [71, 20], [69, 30], [60, 40], [50, 32],
    [45, 28], [40, 22], [36, 15],
  ],
  [
    [40, 22], [50, 32], [60, 40], [70, 60], [72, 100], [66, 140], [55, 165], [45, 150],
    [38, 130], [20, 122], [8, 110], [20, 100], [25, 80], [8, 77], [20, 60], [30, 50],
  ],
  [
    [72, -168], [68, -140], [58, -125], [48, -124], [32, -117], [18, -105], [8, -82],
    [18, -72], [30, -82], [42, -67], [53, -55], [62, -64], [70, -95],
  ],
  [
    [12, -81], [6, -77], [-5, -80], [-18, -70], [-34, -72], [-55, -68], [-48, -54],
    [-28, -48], [-8, -35], [5, -51],
  ],
  [
    [-11, 113], [-22, 114], [-35, 116], [-39, 146], [-28, 154], [-12, 143], [-10, 126],
  ],
  [[59, -52], [68, -54], [82, -42], [79, -18], [66, -24]],
];

const graticules: readonly (readonly GeoPoint[])[] = [
  ...[-60, -30, 0, 30, 60].map((latitude) =>
    Array.from({ length: 73 }, (_, index) => [latitude, -180 + index * 5] as GeoPoint),
  ),
  ...[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150, 180].map((longitude) =>
    Array.from({ length: 33 }, (_, index) => [-80 + index * 5, longitude] as GeoPoint),
  ),
];

function withAlpha(color: string, alpha: number) {
  return color.replace(/\)$/, ` / ${alpha})`);
}

function projectGeoPoint(
  [latitude, longitude]: GeoPoint,
  rotationDegrees: number,
  centerX: number,
  centerY: number,
  radius: number,
) {
  const latitudeRadians = (latitude * Math.PI) / 180;
  const longitudeRadians = ((longitude + rotationDegrees) * Math.PI) / 180;
  const depth = Math.cos(latitudeRadians) * Math.cos(longitudeRadians);
  return {
    visible: depth >= 0,
    x: centerX + Math.cos(latitudeRadians) * Math.sin(longitudeRadians) * radius,
    y: centerY - Math.sin(latitudeRadians) * radius,
  };
}

function traceGeoPath(
  context: CanvasRenderingContext2D,
  points: readonly GeoPoint[],
  rotationDegrees: number,
  centerX: number,
  centerY: number,
  radius: number,
) {
  let drawing = false;
  let visiblePoints = 0;
  context.beginPath();
  for (const point of points) {
    const projected = projectGeoPoint(point, rotationDegrees, centerX, centerY, radius);
    if (!projected.visible) {
      drawing = false;
      continue;
    }
    if (drawing) context.lineTo(projected.x, projected.y);
    else context.moveTo(projected.x, projected.y);
    drawing = true;
    visiblePoints += 1;
  }
  return visiblePoints;
}

export function EarthloomExperience({ snapshot }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef({ x: 0, y: 0 });
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const random = randomFactory(snapshot.seed);
    const particles = Array.from({ length: 116 }, () => ({
      x: random(),
      y: random(),
      radius: 0.35 + random() * 1.4,
      alpha: 0.12 + random() * 0.52,
      drift: random() * 1.7,
    }));
    const stormEnergy = Math.min(1, Math.max(0, snapshot.metrics.kpIndex / 9));
    const weatherFlow = Math.min(1.6, Math.max(0.65, snapshot.metrics.meanWind / 12));
    const threadCount = 24 + Math.round(snapshot.metrics.kpIndex * 3.5);
    const threadOffsets = Array.from({ length: threadCount }, () => ({
      offset: random() * Math.PI * 2,
      amplitude: (0.018 + random() * 0.075) * weatherFlow,
      weight: 0.35 + random() * 1.5,
      alpha: 0.07 + random() * (0.18 + stormEnergy * 0.18),
    }));

    let frame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    const start = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const draw = (now: number) => {
      const time = (now - start) / 1000;
      const motion = paused || reducedMotion ? 0 : time;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      const background = context.createRadialGradient(
        width * 0.58,
        height * 0.46,
        0,
        width * 0.52,
        height * 0.5,
        Math.max(width, height) * 0.78,
      );
      background.addColorStop(0, snapshot.palette.ink);
      background.addColorStop(0.44, snapshot.palette.void);
      background.addColorStop(1, "#05060b");
      context.fillStyle = background;
      context.fillRect(0, 0, width, height);

      particles.forEach((particle) => {
        const pulse = 0.72 + Math.sin(motion * particle.drift + particle.x * 20) * 0.28;
        context.beginPath();
        context.fillStyle = `rgba(235, 238, 245, ${particle.alpha * pulse})`;
        context.arc(particle.x * width, particle.y * height, particle.radius, 0, Math.PI * 2);
        context.fill();
      });

      const radius = Math.min(width, height) * 0.335;
      const centerX = width * 0.52 + pointerRef.current.x * 8;
      const centerY = height * 0.49 + pointerRef.current.y * 7;
      const rotationDegrees = -15 + motion * Math.min(4, Math.max(1.2, snapshot.metrics.solarWind / 180));

      context.save();
      context.globalCompositeOperation = "screen";
      const aura = context.createRadialGradient(centerX, centerY, radius * 0.5, centerX, centerY, radius * 1.44);
      aura.addColorStop(0, "rgba(0,0,0,0)");
      aura.addColorStop(0.62, snapshot.palette.aurora.replace(")", " / 0.11)"));
      aura.addColorStop(1, "rgba(0,0,0,0)");
      context.fillStyle = aura;
      context.beginPath();
      context.arc(centerX, centerY, radius * 1.44, 0, Math.PI * 2);
      context.fill();
      context.restore();

      context.save();
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.clip();

      const sphere = context.createLinearGradient(centerX - radius, centerY - radius, centerX + radius, centerY + radius);
      sphere.addColorStop(0, "#173044");
      sphere.addColorStop(0.42, snapshot.palette.ink);
      sphere.addColorStop(0.7, "#0d1728");
      sphere.addColorStop(1, snapshot.palette.void);
      context.fillStyle = sphere;
      context.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);

      context.save();
      context.globalCompositeOperation = "screen";
      context.strokeStyle = withAlpha(snapshot.palette.mist, 0.13);
      context.lineWidth = 0.55;
      for (const graticule of graticules) {
        traceGeoPath(context, graticule, rotationDegrees, centerX, centerY, radius * 0.93);
        context.stroke();
      }
      context.restore();

      context.save();
      context.globalCompositeOperation = "screen";
      context.fillStyle = withAlpha(snapshot.palette.aurora, 0.095 + stormEnergy * 0.055);
      context.strokeStyle = withAlpha(snapshot.palette.aurora, 0.46);
      context.lineWidth = 0.85;
      for (const landMass of landMasses) {
        const visiblePoints = traceGeoPath(context, landMass, rotationDegrees, centerX, centerY, radius * 0.9);
        if (visiblePoints === landMass.length) {
          context.closePath();
          context.fill();
        }
        context.stroke();
      }
      context.restore();

      context.globalCompositeOperation = "screen";
      threadOffsets.forEach((thread, index) => {
        const y = centerY - radius * 0.84 + (index / (threadOffsets.length - 1)) * radius * 1.68;
        const envelope = Math.sqrt(Math.max(0, 1 - ((y - centerY) / radius) ** 2));
        const span = radius * envelope;
        context.beginPath();
        for (let step = 0; step <= 92; step += 1) {
          const ratio = step / 92;
          const x = centerX - span + ratio * span * 2;
          const wave = Math.sin(
            ratio * Math.PI * (2.5 + index % 4) +
              thread.offset +
              motion * (0.12 + snapshot.metrics.meanWind / 60),
          );
          const drift = Math.cos(ratio * Math.PI * 1.4 + index * 0.43) * radius * thread.amplitude;
          const py = y + wave * radius * thread.amplitude * 0.55 + drift;
          if (step === 0) context.moveTo(x, py);
          else context.lineTo(x, py);
        }
        context.strokeStyle = index % 5 === 0 ? snapshot.palette.ember : index % 2 === 0 ? snapshot.palette.aurora : snapshot.palette.tide;
        context.globalAlpha = thread.alpha;
        context.lineWidth = thread.weight;
        context.stroke();
      });

      snapshot.earthquakes.forEach((quake, index) => {
        const longitude = ((quake.longitude + rotationDegrees + 540) % 360) - 180;
        const longitudeRadians = (longitude * Math.PI) / 180;
        const latitudeRadians = (quake.latitude * Math.PI) / 180;
        const visibility = Math.cos(longitudeRadians);
        if (visibility < -0.12) return;
        const x = centerX + Math.sin(longitudeRadians) * Math.cos(latitudeRadians) * radius * 0.87;
        const y = centerY - Math.sin(latitudeRadians) * radius * 0.87;
        const base = 2 + quake.magnitude * 1.45;
        const depthFade = 1 - Math.min(1, quake.depth / 700);
        context.globalAlpha = (0.16 + Math.max(0, visibility) * 0.46) * (0.42 + depthFade * 0.58);
        context.strokeStyle = snapshot.palette.ember;
        context.lineWidth = index === 0 ? 1.4 : 0.75;
        context.beginPath();
        context.arc(x, y, base + Math.sin(motion * 0.7 + index) * 1.5, 0, Math.PI * 2);
        context.stroke();
        context.beginPath();
        context.arc(x, y, Math.max(1.2, quake.magnitude * 0.45), 0, Math.PI * 2);
        context.fillStyle = snapshot.palette.mist;
        context.fill();
      });
      context.restore();

      context.save();
      context.strokeStyle = "rgba(255,255,255,.2)";
      context.lineWidth = 0.8;
      context.beginPath();
      context.arc(centerX, centerY, radius, 0, Math.PI * 2);
      context.stroke();
      context.restore();

      context.save();
      context.beginPath();
      context.arc(centerX, centerY, radius * 0.99, 0, Math.PI * 2);
      context.clip();
      const shadowShift = (snapshot.metrics.moonPhase - 0.5) * radius * 1.85;
      const shadow = context.createRadialGradient(
        centerX + shadowShift,
        centerY - radius * 0.08,
        radius * 0.08,
        centerX + shadowShift,
        centerY,
        radius * 1.18,
      );
      shadow.addColorStop(0, "rgba(3, 4, 10, .02)");
      shadow.addColorStop(0.68, "rgba(3, 4, 10, .2)");
      shadow.addColorStop(1, "rgba(3, 4, 10, .62)");
      context.fillStyle = shadow;
      context.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
      context.restore();

      context.save();
      context.beginPath();
      context.arc(centerX, centerY, radius * 0.99, 0, Math.PI * 2);
      context.clip();
      context.globalCompositeOperation = "screen";
      context.strokeStyle = withAlpha(snapshot.palette.mist, 0.16);
      context.lineWidth = 0.5;
      for (const graticule of graticules) {
        traceGeoPath(context, graticule, rotationDegrees, centerX, centerY, radius * 0.93);
        context.stroke();
      }
      context.strokeStyle = withAlpha(snapshot.palette.aurora, 0.56);
      context.lineWidth = 0.9;
      for (const landMass of landMasses) {
        traceGeoPath(context, landMass, rotationDegrees, centerX, centerY, radius * 0.9);
        context.stroke();
      }
      context.restore();

      if (!paused && !reducedMotion) frame = window.requestAnimationFrame(draw);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    frame = window.requestAnimationFrame(draw);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [paused, snapshot]);

  return (
    <div
      className="earthloom-canvas-shell"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        pointerRef.current = {
          x: (event.clientX - rect.left) / rect.width - 0.5,
          y: (event.clientY - rect.top) / rect.height - 0.5,
        };
      }}
      onPointerLeave={() => {
        pointerRef.current = { x: 0, y: 0 };
      }}
    >
      <canvas
        ref={canvasRef}
        aria-label={`今日地球数据画像：${snapshot.metrics.earthquakeCount} 次地震、Kp ${snapshot.metrics.kpIndex}、太阳风 ${snapshot.metrics.solarWind} 公里每秒。`}
        role="img"
      />
      <div className="canvas-index" aria-hidden="true">
        <span>ORTHOGRAPHIC / PLANET VIEW</span>
        <span>{snapshot.metrics.earthquakeCount} EVENTS · LAST 24H</span>
      </div>
      <div className="globe-key" aria-hidden="true">
        <span><i className="globe-key-land" /> CONTINENTS / ROTATING</span>
        <span><i className="globe-key-quake" /> SEISMIC PULSES / GEOLOCATED</span>
      </div>
      <button
        aria-label={paused ? "播放作品动画" : "暂停作品动画"}
        className="motion-toggle"
        onClick={() => setPaused((value) => !value)}
        type="button"
      >
        <span className={paused ? "play-icon" : "pause-icon"} aria-hidden="true" />
        {paused ? "PLAY" : "PAUSE"}
      </button>
    </div>
  );
}
