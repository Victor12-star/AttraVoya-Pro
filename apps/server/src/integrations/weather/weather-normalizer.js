function valueAt(values, index) {
  return Array.isArray(values) ? (values[index] ?? null) : null;
}

/** Normalize Open-Meteo output into AttraVoya's stable weather domain shape. */
export function normalizeOpenMeteoForecast(payload, fetchedAt = new Date().toISOString()) {
  if (!payload || typeof payload !== 'object') {
    throw new TypeError('Open-Meteo payload must be an object.');
  }

  const dailyTimes = Array.isArray(payload.daily?.time) ? payload.daily.time : [];

  return {
    provider: 'openmeteo',
    fetchedAt,
    latitude: Number(payload.latitude),
    longitude: Number(payload.longitude),
    timezone: payload.timezone ?? 'UTC',
    timezoneAbbreviation: payload.timezone_abbreviation ?? null,
    current: {
      time: payload.current?.time ?? null,
      temperatureC: payload.current?.temperature_2m ?? null,
      feelsLikeC: payload.current?.apparent_temperature ?? null,
      precipitationMm: payload.current?.precipitation ?? null,
      rainMm: payload.current?.rain ?? null,
      weatherCode: payload.current?.weather_code ?? null,
      cloudCoverPercent: payload.current?.cloud_cover ?? null,
      windSpeedKmh: payload.current?.wind_speed_10m ?? null,
      windGustKmh: payload.current?.wind_gusts_10m ?? null,
    },
    daily: dailyTimes.map((date, index) => ({
      date,
      weatherCode: valueAt(payload.daily?.weather_code, index),
      temperatureMaxC: valueAt(payload.daily?.temperature_2m_max, index),
      temperatureMinC: valueAt(payload.daily?.temperature_2m_min, index),
      precipitationMm: valueAt(payload.daily?.precipitation_sum, index),
      precipitationProbabilityPercent: valueAt(payload.daily?.precipitation_probability_max, index),
      windSpeedMaxKmh: valueAt(payload.daily?.wind_speed_10m_max, index),
      sunrise: valueAt(payload.daily?.sunrise, index),
      sunset: valueAt(payload.daily?.sunset, index),
    })),
  };
}
