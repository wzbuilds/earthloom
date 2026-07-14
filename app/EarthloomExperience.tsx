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
    const threadOffsets = Array.from({ length: 34 }, () => ({
      offset: random() * Math.PI * 2,
      amplitude: 0.02 + random() * 0.09,
      weight: 0.35 + random() * 1.5,
      alpha: 0.05 + random() * 0.22,
    }));

    let frame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let start = performance.now();

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
      sphere.addColorStop(0, snapshot.palette.ink);
      sphere.addColorStop(0.55, "#101523");
      sphere.addColorStop(1, snapshot.palette.void);
      context.fillStyle = sphere;
      context.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);

      context.globalCompositeOperation = "screen";
      threadOffsets.forEach((thread, index) => {
        const y = centerY - radius * 0.84 + (index / (threadOffsets.length - 1)) * radius * 1.68;
        const envelope = Math.sqrt(Math.max(0, 1 - ((y - centerY) / radius) ** 2));
        const span = radius * envelope;
        context.beginPath();
        for (let step = 0; step <= 92; step += 1) {
          const ratio = step / 92;
          const x = centerX - span + ratio * span * 2;
          const wave = Math.sin(ratio * Math.PI * (2.5 + index % 4) + thread.offset + motion * 0.07);
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

      snapshot.earthquakes.slice(0, 24).forEach((quake, index) => {
        const longitude = ((quake.longitude + 180 + motion * 0.45) % 360) - 180;
        const longitudeRadians = (longitude * Math.PI) / 180;
        const latitudeRadians = (quake.latitude * Math.PI) / 180;
        const depth = Math.cos(longitudeRadians);
        if (depth < -0.12) return;
        const x = centerX + Math.sin(longitudeRadians) * Math.cos(latitudeRadians) * radius * 0.87;
        const y = centerY - Math.sin(latitudeRadians) * radius * 0.87;
        const base = 2 + quake.magnitude * 1.45;
        context.globalAlpha = 0.16 + Math.max(0, depth) * 0.46;
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
      shadow.addColorStop(1, "rgba(3, 4, 10, .72)");
      context.fillStyle = shadow;
      context.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
      context.restore();

      frame = window.requestAnimationFrame(draw);
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
      <canvas ref={canvasRef} aria-hidden="true" />
      <div className="canvas-index" aria-hidden="true">
        <span>LAT 31.2304° N</span>
        <span>LON 121.4737° E</span>
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
