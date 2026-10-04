// Modele MediaPipe: najpierw te dołączone do aplikacji (assets/models – działa offline),
// potem pobrane wcześniej do katalogu danych; pobieramy tylko, gdy nie ma ich nigdzie.
// Zmiana pliku modelu w analizatorze = podmień też plik w assets/models.
import { net } from 'electron';
import { tr } from '../shared/i18n';
import { existsSync } from 'node:fs';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const MODELS = [
  {
    // „full” (MP5): stabilniejsze barki i uszy niż „lite”. Lite zostaje jako zapas w analizatorze.
    file: 'pose_landmarker_full.task',
    url: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task',
  },
  {
    file: 'face_landmarker.task',
    url: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
  },
] as const;

/** Pierwsza ścieżka z pliku modelu w podanych katalogach (kolejność = priorytet) albo null. */
export function findModel(file: string, dirs: string[]): string | null {
  for (const d of dirs) {
    const p = path.join(d, path.basename(file));
    if (existsSync(p)) return p;
  }
  return null;
}

/** Gotowe, gdy jest model twarzy i dowolny model sylwetki (full albo zapasowy lite). */
export const modelsReady = (dirs: string[]): boolean =>
  !!findModel('face_landmarker.task', dirs) &&
  (!!findModel('pose_landmarker_full.task', dirs) || !!findModel('pose_landmarker_lite.task', dirs));

/** Pobiera brakujące modele; `progress` dostaje 0–1. */
export async function ensureModels(dir: string, searchDirs: string[], progress: (p: number, file: string) => void): Promise<void> {
  await mkdir(dir, { recursive: true });
  const missing = MODELS.filter((m) => !findModel(m.file, searchDirs));
  for (let i = 0; i < missing.length; i++) {
    const m = missing[i];
    const res = await net.fetch(m.url);
    if (!res.ok || !res.body) throw new Error(tr('Nie udało się pobrać {f} (HTTP {s})', { f: m.file, s: res.status }));
    const total = Number(res.headers.get('content-length') ?? 0);
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.length;
      if (total) progress((i + got / total) / missing.length, m.file);
    }
    const tmp = path.join(dir, `${m.file}.part`);
    await writeFile(tmp, Buffer.concat(chunks));
    await rename(tmp, path.join(dir, m.file));
    progress((i + 1) / missing.length, m.file);
  }
}
