// Wypełnia osobną bazę przykładowymi danymi z 12 dni – do podglądu statystyk bez czekania.
// Użycie: npm run seed-demo, potem npm run demo:stats (dane trafiają do ./demo-data, nie do Twoich danych).
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const dir = path.resolve(process.argv[2] ?? process.env.POSTURA_DATA ?? 'demo-data');
mkdirSync(dir, { recursive: true });
const db = new DatabaseSync(path.join(dir, 'postura.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS minutes (ts INTEGER PRIMARY KEY, present REAL, posture REAL, good_ratio REAL, fatigue REAL,
    blink_rate REAL, perclos REAL, long_blinks REAL, yawns INTEGER, kb INTEGER, mouse INTEGER, issues TEXT);
  CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER NOT NULL, type TEXT NOT NULL, detail TEXT);
  CREATE TABLE IF NOT EXISTS kv (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS garmin_daily (date TEXT PRIMARY KEY, sleep_hours REAL, sleep_score REAL, stress_avg REAL,
    bb_high REAL, bb_low REAL, resting_hr REAL, hrv REAL);
  DELETE FROM minutes; DELETE FROM events; DELETE FROM garmin_daily;
`);

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const ins = db.prepare('INSERT INTO minutes VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
const ev = db.prepare('INSERT INTO events(ts, type, detail) VALUES (?,?,?)');
const gar = db.prepare('INSERT INTO garmin_daily VALUES (?,?,?,?,?,?,?,?)');
const now = new Date();
const p2 = (n) => String(n).padStart(2, '0');

for (let d = 11; d >= 0; d--) {
  const day = new Date(now);
  day.setDate(now.getDate() - d);
  if (day.getDay() === 0) continue; // niedziela wolna
  const sleep = 5.4 + rnd() * 2.8;
  const dateStr = `${day.getFullYear()}-${p2(day.getMonth() + 1)}-${p2(day.getDate())}`;
  gar.run(dateStr, Math.round(sleep * 10) / 10, Math.round(50 + sleep * 5 + rnd() * 10), Math.round(22 + rnd() * 18),
    Math.round(45 + sleep * 6 + rnd() * 8), Math.round(10 + rnd() * 15), 52 + Math.round(rnd() * 6), 48 + Math.round(rnd() * 20));
  const sleepPenalty = Math.max(0, 7 - sleep) * 6;
  const endHour = d === 0 ? Math.min(17, Math.max(9, now.getHours())) : 17;
  for (let h = 8; h < endHour; h++) {
    for (let m = 0; m < 60; m++) {
      if (h === 12 && m < 30) continue; // obiad
      const t = new Date(day);
      t.setHours(h, m, 0, 0);
      if (t > now) break;
      const sinceBreak = m % 50;
      const morning = h >= 9 && h < 11 ? 8 : 0;
      const dip = h === 13 || h === 14 ? -12 : 0;
      const fatigue = Math.max(3, Math.min(95, 18 + sinceBreak * 0.5 + (h - 8) * 3 - morning - dip + sleepPenalty + (rnd() - 0.5) * 12));
      const posture = Math.max(30, Math.min(99, 88 + morning + dip * 0.8 - sinceBreak * 0.25 - sleepPenalty * 0.6 + (rnd() - 0.5) * 14));
      const issues = {};
      if (posture < 75) issues[rnd() < 0.55 ? 'headForward' : rnd() < 0.6 ? 'slouch' : 'tooClose'] = Math.round(20 + rnd() * 40);
      if (rnd() < 0.08) issues.shoulderTilt = Math.round(10 + rnd() * 30);
      ins.run(t.getTime(), rnd() < 0.06 ? 0 : 1, Math.round(posture), posture >= 80 ? 0.9 : posture >= 65 ? 0.5 : 0.1,
        Math.round(fatigue), Math.round((17 - fatigue / 10 + (rnd() - 0.5) * 4) * 10) / 10, Math.round((0.02 + fatigue / 900) * 1000) / 1000,
        Math.round(fatigue / 40 * 10) / 10, fatigue > 60 && rnd() < 0.05 ? 1 : 0,
        Math.round((70 + morning * 4 + dip * 2 - fatigue * 0.4) * (0.7 + rnd() * 0.6)), Math.round(40 + rnd() * 40), JSON.stringify(issues));
      if (m === 30 || m === 59) ev.run(t.getTime(), 'break-done', 'micro:chin-tuck');
      if (posture < 55 && rnd() < 0.2) ev.run(t.getTime(), 'alert', 'headForward');
    }
  }
}
db.prepare("INSERT INTO kv(key, value) VALUES('secret:garmin', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
  .run(JSON.stringify(`plain:${Buffer.from(JSON.stringify({ email: 'demo@example.com', password: 'x' })).toString('base64')}`));
db.prepare("INSERT INTO kv(key, value) VALUES('meta:garminLastSync', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(JSON.stringify(Date.now()));
console.log('Dane demo zapisane w', dir);
