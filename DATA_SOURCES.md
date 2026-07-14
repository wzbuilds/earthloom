# Data sources and attribution

Earthloom captures small, transformed snapshots of public environmental feeds so that each generated portrait remains reproducible.

## USGS Earthquake Hazards Program

- Endpoint: `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson`
- Fields retained: event identifier, coordinates, depth, magnitude, place and event time.
- Terms and attribution: [USGS data and product policies](https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits).

## NOAA Space Weather Prediction Center

- Planetary K-index: `https://services.swpc.noaa.gov/json/planetary_k_index_1m.json`
- Solar-wind summary: `https://services.swpc.noaa.gov/products/summary/solar-wind-speed.json`
- Fields retained: peak recent K-index and current proton speed.
- Source: [NOAA SWPC data service](https://services.swpc.noaa.gov/).

## Open-Meteo

- Endpoint: `https://api.open-meteo.com/v1/forecast`
- Fields retained: current temperature and wind speed for twelve fixed global sample points.
- Attribution: weather data by [Open-Meteo.com](https://open-meteo.com/), licensed under CC BY 4.0.

## Lunar phase

The phase is calculated locally from the known new-moon epoch `2000-01-06T18:14:00Z` and a synodic month of `29.53058867` days. It is a visual input, not an astronomical ephemeris.

## Failure behavior

Each source is fetched independently with a timeout and retry budget. If a source is unavailable, Earthloom uses the last versioned reading when possible and marks the source `cached`; a built-in neutral value is marked `fallback`. The overall portrait status then becomes `partial` instead of pretending all readings are live.

