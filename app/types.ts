export type SourceStatus = "live" | "cached" | "fallback";

export interface EarthquakeEvent {
  id: string;
  latitude: number;
  longitude: number;
  depth: number;
  magnitude: number;
  place: string;
  time: string;
}

export interface WeatherSample {
  latitude: number;
  longitude: number;
  temperature: number;
  wind: number;
}

export interface EarthloomSnapshot {
  schemaVersion: number;
  date: string;
  generatedAt: string;
  timeZone: string;
  status: "live" | "partial";
  seed: number;
  summary: string;
  metrics: {
    earthquakeCount: number;
    maxMagnitude: number;
    averageDepth: number;
    kpIndex: number;
    solarWind: number;
    meanTemperature: number;
    meanWind: number;
    moonPhase: number;
  };
  palette: {
    void: string;
    ink: string;
    aurora: string;
    tide: string;
    ember: string;
    mist: string;
  };
  earthquakes: EarthquakeEvent[];
  weatherSamples: WeatherSample[];
  sources: Array<{
    label: string;
    url: string;
    status: SourceStatus;
  }>;
}
