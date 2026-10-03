// Prawdziwe ustawienie głowy z macierzy transformacji twarzy MediaPipe (FaceLandmarker,
// outputFacialTransformationMatrixes). Zamiast pośredniej odległości nos–barki dostajemy
// pochylenie, obrót i przechył głowy w stopniach.
//
// Macierz 4×4 (kolumnowo, jak w OpenGL) przenosi kanoniczny model twarzy do układu kamery:
// x w prawo, y w górę, z w stronę kamery. Kąty liczymy z dwóch wektorów twarzy,
// a nie z rozkładu Eulera, więc nie zależą od kolejności obrotów:
//  - „przód” twarzy = R·(0,0,1) (trzecia kolumna): pochylenie i obrót,
//  - „góra” twarzy = R·(0,1,0) (druga kolumna): przechył.

export interface HeadPose {
  /** Pochylenie: dodatnie = głowa w dół (broda do klatki), stopnie. */
  pitchDeg: number;
  /** Obrót w bok: dodatni = twarz w prawo na obrazie, stopnie. */
  yawDeg: number;
  /** Przechył: dodatni = głowa przechylona zgodnie z ruchem wskazówek zegara na obrazie, stopnie. */
  rollDeg: number;
}

const DEG = 180 / Math.PI;

/** Element r(wiersz, kolumna) macierzy zapisanej kolumnowo (16 liczb). */
const at = (m: ArrayLike<number>, row: number, col: number) => m[col * 4 + row];

export function headPoseFromMatrix(m: ArrayLike<number> | null | undefined): HeadPose | null {
  if (!m || m.length < 16) return null;
  // Usuwamy skalę (macierz MediaPipe bywa przeskalowana): normalizujemy kolumny.
  const col = (c: number): [number, number, number] => {
    const x = at(m, 0, c), y = at(m, 1, c), z = at(m, 2, c);
    const n = Math.hypot(x, y, z);
    return n > 0 ? [x / n, y / n, z / n] : [0, 0, 0];
  };
  const [ux, uy] = col(1); // góra twarzy
  const [fx, fy, fz] = col(2); // przód twarzy
  if (fz === 0 && fy === 0 && fx === 0) return null;
  return {
    pitchDeg: Math.atan2(-fy, Math.hypot(fx, fz)) * DEG,
    yawDeg: Math.atan2(fx, fz) * DEG,
    rollDeg: Math.atan2(ux, uy) * DEG,
  };
}

/** Macierz obrotu (kolumnowo) z kątów – do testów i trybu demo. */
export function matrixFromHeadPose(pitchDeg: number, yawDeg: number, rollDeg: number): number[] {
  const p = pitchDeg / DEG, y = yawDeg / DEG, r = rollDeg / DEG;
  // Kolejność: przechył (z), potem pochylenie (x, dodatnie = w dół), potem obrót (y).
  const Rz = [
    [Math.cos(r), Math.sin(r), 0],
    [-Math.sin(r), Math.cos(r), 0],
    [0, 0, 1],
  ];
  const Rx = [
    [1, 0, 0],
    [0, Math.cos(p), -Math.sin(p)],
    [0, Math.sin(p), Math.cos(p)],
  ];
  const Ry = [
    [Math.cos(y), 0, Math.sin(y)],
    [0, 1, 0],
    [-Math.sin(y), 0, Math.cos(y)],
  ];
  const mul = (a: number[][], b: number[][]) => a.map((row) => [0, 1, 2].map((j) => row.reduce((s, v, k) => s + v * b[k][j], 0)));
  const R = mul(Ry, mul(Rx, Rz));
  const out = new Array<number>(16).fill(0);
  for (let c = 0; c < 3; c++) for (let rr = 0; rr < 3; rr++) out[c * 4 + rr] = R[rr][c];
  out[15] = 1;
  return out;
}
