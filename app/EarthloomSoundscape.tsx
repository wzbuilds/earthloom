"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { deriveSoundscapePlan } from "./soundscape-plan";
import type { EarthloomSnapshot } from "./types";

type PlaybackState = "idle" | "starting" | "playing" | "paused" | "unsupported" | "error";
interface SoundscapeEngine {
  context: AudioContext;
  resume: () => Promise<boolean>;
  suspend: () => Promise<void>;
  setVolume: (volume: number) => void;
  destroy: () => void;
}
const DEFAULT_VOLUME = 36;
const VOLUME_STORAGE_KEY = "earthloom-soundscape-volume";
function oscillatorFrequency(rootFrequency: number, interval: number) {
  return rootFrequency * (2 ** (interval / 12));
}
function createSoundscapeEngine(snapshot: EarthloomSnapshot, initialVolume: number): SoundscapeEngine | null {
  const AudioContextClass = window.AudioContext
    ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

  if (!AudioContextClass) {
    return null;
  }

  const plan = deriveSoundscapePlan(snapshot);
  const context = new AudioContextClass();
  const sourceNodes: AudioScheduledSourceNode[] = [];
  const master = context.createGain();
  const toneBus = context.createGain();
  const lowpass = context.createBiquadFilter();
  const dry = context.createGain();
  const delay = context.createDelay(1.2);
  const wet = context.createGain();
  let currentVolume = initialVolume;
  let schedulerTimer: number | undefined;
  let nextStepAt = 0;
  let currentStep = 0;
  let destroyed = false;

  master.gain.value = 0.0001;
  master.connect(context.destination);

  lowpass.type = "lowpass";
  lowpass.frequency.value = plan.brightness;
  lowpass.Q.value = 0.72;
  toneBus.connect(lowpass);
  lowpass.connect(dry);
  dry.gain.value = 0.88;
  dry.connect(master);
  lowpass.connect(delay);
  delay.delayTime.value = plan.delayTime;
  delay.connect(wet);
  wet.gain.value = plan.delayWet;
  wet.connect(master);

  const voiceGain = 0.18 / plan.voiceIntervals.length;
  plan.voiceIntervals.forEach((interval, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = index % 2 === 0 ? "sine" : "triangle";
    oscillator.frequency.value = oscillatorFrequency(plan.rootFrequency, interval);
    oscillator.detune.value = (index - (plan.voiceIntervals.length - 1) / 2) * 3.5;
    gain.gain.value = voiceGain;
    oscillator.connect(gain);
    gain.connect(toneBus);
    oscillator.start();
      sourceNodes.push(oscillator);
  });
  const drift = context.createOscillator();
  const driftDepth = context.createGain();
  drift.type = "sine";
  drift.frequency.value = plan.driftRate;
  driftDepth.gain.value = 120 + snapshot.metrics.solarWind * 0.16;
  drift.connect(driftDepth);
  driftDepth.connect(lowpass.frequency);
  drift.start();
  sourceNodes.push(drift);
  function playPulse(event: (typeof plan.pulseEvents)[number], startAt: number) {
    if (destroyed) return;

    const oscillator = context.createOscillator();
    const pulseFilter = context.createBiquadFilter();
    const pulseGain = context.createGain();
    const panner = context.createStereoPanner();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(event.frequency, startAt);
    oscillator.frequency.exponentialRampToValueAtTime(event.frequency * 0.78, startAt + event.duration);
    pulseFilter.type = "lowpass";
    pulseFilter.frequency.value = event.cutoff;
    panner.pan.value = event.pan;
    pulseGain.gain.setValueAtTime(0.0001, startAt);
    pulseGain.gain.exponentialRampToValueAtTime(event.gain, startAt + 0.035);
    pulseGain.gain.exponentialRampToValueAtTime(0.0001, startAt + event.duration);
    oscillator.connect(pulseFilter);
    pulseFilter.connect(pulseGain);
    pulseGain.connect(panner);
    panner.connect(toneBus);
    oscillator.start(startAt);
    oscillator.stop(startAt + event.duration + 0.05);
    oscillator.addEventListener("ended", () => {
      oscillator.disconnect();
      pulseFilter.disconnect();
      pulseGain.disconnect();
      panner.disconnect();
    }, { once: true });
  }
  function stopScheduler() {
    if (schedulerTimer !== undefined) {
      window.clearTimeout(schedulerTimer);
      schedulerTimer = undefined;
    }
  }
  function schedulerTick() {
    if (destroyed || context.state !== "running") {
      stopScheduler();
      return;
    }

    const scheduleUntil = context.currentTime + 0.2;
    const stepDuration = 60 / plan.tempo;
    while (nextStepAt < scheduleUntil) {
      const pulse = plan.pulseEvents.find((event) => event.step === currentStep);
      if (pulse) playPulse(pulse, nextStepAt);
      currentStep = (currentStep + 1) % plan.scoreSteps;
      nextStepAt += stepDuration;
    }
    schedulerTimer = window.setTimeout(schedulerTick, 75);
  }
  function startScheduler() {
    stopScheduler();
    nextStepAt = context.currentTime + 0.45;
    schedulerTimer = window.setTimeout(schedulerTick, 40);
  }
  function setVolume(volume: number) {
    currentVolume = volume;
    const normalizedVolume = Math.min(100, Math.max(0, volume)) / 100;
    const target = Math.max(0.0001, normalizedVolume * normalizedVolume * 0.75);
    master.gain.cancelScheduledValues(context.currentTime);
    master.gain.setTargetAtTime(target, context.currentTime, 0.045);
  }
  return {
    context,
    async resume() {
      if (destroyed) return false;
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setValueAtTime(0.0001, context.currentTime);
      await context.resume();
      if (context.state === "running") {
        setVolume(currentVolume);
        startScheduler();
      }
      return context.state === "running";
    },
    async suspend() {
      if (destroyed || context.state !== "running") return;
      stopScheduler();
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(0.0001, context.currentTime, 0.025);
      await new Promise((resolve) => window.setTimeout(resolve, 70));
      await context.suspend();
    },
    setVolume,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      stopScheduler();
      sourceNodes.forEach((source) => {
        try {
          source.stop();
        } catch {
          // The browser may already have stopped a source during teardown.
        }
        source.disconnect();
      });
      toneBus.disconnect();
      lowpass.disconnect();
      delay.disconnect();
      wet.disconnect();
      dry.disconnect();
      master.disconnect();
      void context.close().catch(() => undefined);
    },
  };
}
interface EarthloomSoundscapeProps {
  snapshot: EarthloomSnapshot;
}
export function EarthloomSoundscape({ snapshot }: EarthloomSoundscapeProps) {
  const [playbackState, setPlaybackState] = useState<PlaybackState>("idle");
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const engineRef = useRef<SoundscapeEngine | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    return () => {
      engineRef.current?.destroy();
      engineRef.current = null;
    };
  }, []);
  async function startSoundscape() {
    setPlaybackState("starting");
    try {
      let startingVolume = volume;
      try {
        const storedVolume = Number(window.localStorage.getItem(VOLUME_STORAGE_KEY));
        if (Number.isFinite(storedVolume) && storedVolume >= 0 && storedVolume <= 100) {
          startingVolume = storedVolume;
          setVolume(storedVolume);
        }
      } catch {
        // Private browsing can block storage without blocking Web Audio.
      }
      const engine = createSoundscapeEngine(snapshot, startingVolume);
      if (!engine) {
        setPlaybackState("unsupported");
        return;
      }
      engineRef.current = engine;
      const isRunning = await engine.resume();
      setPlaybackState(isRunning ? "playing" : "paused");
    } catch {
      engineRef.current?.destroy();
      engineRef.current = null;
      setPlaybackState("error");
    }
  }
  async function togglePlayback() {
    if (playbackState === "idle" || playbackState === "error") {
      await startSoundscape();
      return;
    }
    const engine = engineRef.current;
    if (!engine || playbackState === "starting" || playbackState === "unsupported") return;

    setPlaybackState("starting");
    try {
      if (engine.context.state === "running") {
        await engine.suspend();
        setPlaybackState("paused");
      } else {
        const isRunning = await engine.resume();
        setPlaybackState(isRunning ? "playing" : "paused");
      }
    } catch {
      setPlaybackState("paused");
    }
  }
  function updateVolume(nextVolume: number) {
    setVolume(nextVolume);
    engineRef.current?.setVolume(nextVolume);
    try {
      window.localStorage.setItem(VOLUME_STORAGE_KEY, String(nextVolume));
    } catch {
      // Playback remains available when storage is blocked.
    }
  }
  const isDocked = playbackState === "starting" || playbackState === "playing" || playbackState === "paused";
  useEffect(() => {
    if (isDocked) buttonRef.current?.focus({ preventScroll: true });
  }, [isDocked]);
  const isPlaying = playbackState === "playing";
  const buttonLabel = playbackState === "playing"
    ? "暂停声景"
    : playbackState === "paused"
      ? "继续声景"
      : playbackState === "starting"
        ? "正在连接"
        : playbackState === "error"
          ? "重试今日声景"
          : playbackState === "unsupported"
            ? "当前浏览器不支持"
            : "开启今日声景";
  const statusMessage = playbackState === "playing"
    ? `正在播放 · 谱号 ${snapshot.seed.toString(16).toUpperCase()}`
    : playbackState === "paused"
      ? "声景已暂停"
      : playbackState === "starting"
        ? "正在唤醒今天的地球声音"
        : playbackState === "unsupported"
          ? "此浏览器没有可用的 Web Audio 支持"
          : playbackState === "error"
            ? "声景没有成功启动，可以再次尝试"
            : "由今日数据生成，不会自动播放";
  const control = (
    <section
      className={`soundscape-control${isDocked ? " is-docked" : ""}`}
      role="group"
      aria-label="今日声景控制"
      data-state={playbackState}
    >
      <div className="soundscape-copy">
        <span className="soundscape-kicker">
          <i aria-hidden="true"><b /><b /><b /></i>
          EARTHLOOM SCORE / 今日声景
        </span>
        <strong>听见今天的地球</strong>
        <p id="soundscape-description">
          地震成为低频脉冲，Kp 与太阳风决定和声和节拍；天气与月相塑造音色和空间。这是艺术映射，不是科学声学读数。
        </p>
      </div>
      <div className="soundscape-actions">
        <button
          ref={buttonRef}
          className="soundscape-toggle"
          type="button"
          onClick={togglePlayback}
          disabled={playbackState === "starting" || playbackState === "unsupported"}
          aria-pressed={isPlaying}
          aria-describedby="soundscape-description soundscape-status"
        >
          <span className="soundscape-toggle-mark" aria-hidden="true">
            <i /><i /><i />
          </span>
          <span>{buttonLabel}</span>
        </button>

        {isDocked && (
          <label className="soundscape-volume">
            <span>音量</span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={volume}
              onChange={(event) => updateVolume(Number(event.currentTarget.value))}
              aria-label="今日声景音量"
            />
            <output>{volume}%</output>
          </label>
        )}
      </div>
      <div className="soundscape-readings" aria-label="今日声景使用的数据">
        <span>QUAKES {snapshot.metrics.earthquakeCount}</span>
        <span>KP {snapshot.metrics.kpIndex}</span>
        <span>SOLAR {snapshot.metrics.solarWind} KM/S</span>
      </div>
      <p className="soundscape-status" id="soundscape-status" aria-live="polite">{statusMessage}</p>
    </section>
  );
  return (
    <div className="soundscape-slot">
      {isDocked ? createPortal(control, document.body) : control}
    </div>
  );
}
