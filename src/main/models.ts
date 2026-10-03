// Modele MediaPipe pobierane przy pierwszym uruchomieniu do katalogu danych aplikacji.
import { net } from 'electron';
import { existsSync } from 'node:fs';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const MODELS = [
  {
    file: 'pose_landmarker_lite.task',
    url: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task',
  },
  {
    file: 'face_landmarker.task',
    url: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task',
  },
] as const;

export const modelsReady = (dir: string): boolean => MODELS.every((m) => existsSync(path.join(dir, m.file)));

/** Pobiera brakujące modele; `progress` dostaje 0–1. */
export async function ensureModels(dir: string, progress: (p: number, file: string) => void): Promise<void> {
  await mkdir(dir, { recursive: true });
  const missing = MODELS.filter((m) => !existsSync(path.join(dir, m.file)));
  for (let i = 0; i < missing.length; i++) {
    const m = missing[i];
    const res = await net.fetch(m.url);
    if (!res.ok || !res.body) throw new Error(`Nie udało się pobrać ${m.file} (HTTP ${res.status})`);
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
