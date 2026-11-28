// Run this on your own computer: `npm run smoke:live`.
// It calls the real Open-Meteo services for five Indian cities and prints what the app would
// see, so you can confirm live data works before you deploy. It needs no key.
import { searchPlace, fetchAir } from "../services/openMeteo.js";
import { formatClock } from "../lib/time.js";
import { bandForAqi } from "../lib/aqi.js";

/** Cities to check; each needs a live reading and at least a day of forecast. */
const CITIES = ["Delhi", "Mumbai", "Kolkata", "Chennai", "Noida"];
let failures = 0;

for (const city of CITIES) {
  try {
    const options = { fetchImpl: fetch };
    const place = await searchPlace(city, options);
    const air = await fetchAir(place.lat, place.lon, options);
    const band = bandForAqi(air.usAqi);
    const hours = air.hourly.length;
    console.log(
      `${place.label.padEnd(28)} AQI ${String(air.usAqi).padStart(3)} (${band.label}), ` +
        `PM2.5 ${air.pm25 ?? "n/a"}, reading for ${formatClock(air.dataTimeMs)} IST, ${hours} forecast hours`,
    );
    if (hours < 24) throw new Error("expected at least 24 hours of forecast");
  } catch (error) {
    failures += 1;
    console.error(
      `${city.padEnd(28)} FAILED: ${error.message}${error.details ? ` (${error.details})` : ""}`,
    );
  }
}

console.log(failures === 0 ? "\nLive data looks good." : `\n${failures} city check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
