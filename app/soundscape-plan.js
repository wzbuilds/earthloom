/**
 * @typedef {Object} SoundscapeSnapshot
 * @property {number} seed
 * @property {{
 *   earthquakeCount: number,
 *   maxMagnitude: number,
 *   averageDepth: number,
 *   kpIndex: number,
 *   solarWind: number,
 *   meanTemperature: number,
 *   meanWind: number,
 *   moonPhase: number,
 * }} metrics
 * @property {Array<{
 *   id: string,
 *   longitude: number,
 *   depth: number,
 *   magnitude: number,
 *   time: string,
 * }>} earthquakes
 */

const SCALE_INTERVALS = [0, 3, 7, 10];
const ROOT_MIDI_NOTES = [38, 41, 43, 45, 46];
const SCORE_STEPS = 16;

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function mapRange(value, inputMinimum, inputMaximum, outputMinimum, outputMaximum) {
  const progress = clamp((value - inputMinimum) / (inputMaximum - inputMinimum), 0, 1);
  return outputMinimum + progress * (outputMaximum - outputMinimum);
}

function midiToFrequency(note) {
  return 440 * (2 ** ((note - 69) / 12));
}

function createSeededRandom(seed) {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Turn one Earthloom snapshot into a small, deterministic score. The plan is
 * deterministic; browser audio hardware is not expected to produce identical
 * PCM bytes across devices.
 *
 * @param {SoundscapeSnapshot} snapshot
 */
export function deriveSoundscapePlan(snapshot) {
  const random = createSeededRandom(snapshot.seed);
  const metrics = snapshot.metrics;
  const rootNote = ROOT_MIDI_NOTES[snapshot.seed % ROOT_MIDI_NOTES.length];
  const voiceCount = clamp(2 + Math.round(metrics.kpIndex / 4.5), 2, 4);
  const pulseCount = Math.min(
    snapshot.earthquakes.length,
    clamp(Math.round(metrics.earthquakeCount / 10) + 1, 0, 10),
  );
  const availableSteps = Array.from({ length: SCORE_STEPS }, (_, index) => index);

  for (let index = availableSteps.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [availableSteps[index], availableSteps[swapIndex]] = [availableSteps[swapIndex], availableSteps[index]];
  }

  const selectedSteps = availableSteps.slice(0, pulseCount).sort((left, right) => left - right);
  const orderedEarthquakes = [...snapshot.earthquakes].sort((left, right) => {
    const timeOrder = left.time.localeCompare(right.time);
    return timeOrder === 0 ? left.id.localeCompare(right.id) : timeOrder;
  });
  const eventOffset = orderedEarthquakes.length === 0 ? 0 : snapshot.seed % orderedEarthquakes.length;
  const eventStride = Math.max(1, Math.floor(orderedEarthquakes.length / Math.max(1, pulseCount)));
  const rootFrequency = midiToFrequency(rootNote);

  const pulseEvents = selectedSteps.map((step, index) => {
    const event = orderedEarthquakes[(eventOffset + index * eventStride) % orderedEarthquakes.length];
    const depth = clamp(event.depth, 0, 700);

    return {
      id: event.id,
      step,
      frequency: rootFrequency * mapRange(event.magnitude, 2.5, 8, 0.72, 1.3),
      gain: mapRange(event.magnitude, 2.5, 8, 0.16, 0.48),
      duration: mapRange(depth, 0, 700, 1.35, 0.62),
      cutoff: mapRange(depth, 0, 700, 460, 120),
      pan: clamp(event.longitude / 180, -1, 1),
    };
  });

  const lunarArc = Math.sin(clamp(metrics.moonPhase, 0, 1) * Math.PI);

  return {
    seed: snapshot.seed,
    scoreSteps: SCORE_STEPS,
    rootFrequency,
    tempo: mapRange(metrics.solarWind, 250, 850, 42, 68),
    voiceIntervals: SCALE_INTERVALS.slice(0, voiceCount),
    brightness: mapRange(metrics.meanTemperature, -10, 40, 420, 1600) + metrics.kpIndex * 45,
    driftRate: mapRange(metrics.meanWind, 0, 40, 0.025, 0.14),
    delayTime: mapRange(lunarArc, 0, 1, 0.34, 0.62),
    delayWet: mapRange(lunarArc, 0, 1, 0.1, 0.24),
    pulseEvents,
  };
}
