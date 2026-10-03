# FEATURES: everything Postura does (pitch checklist)

> One list so the pitch, video and slides don't forget the small touches. Owner of the pitch: Bartłomiej.
> Every ✅ was checked in code on Sat 2026-10-03; the file is cited in "Where".

**Status legend:** ✅ in main · 🚧 in progress (who) · 📋 planned (PLAN id) · ✂️ cut
**Show in pitch?** ★ = must show · · = mention · blank = no

## Live analysis & overlay
| Feature | What the user sees | Status | Where | Pitch |
|---|---|---|---|---|
| Live camera analysis, fully local | Camera preview with a live score; MediaPipe Pose + Face run on the laptop | ✅ | `renderer/analyzer.ts` | ★ |
| Spine line in posture colour | Thick nose-to-shoulders line turns green / amber / red with the state | ✅ | `renderer/draw.ts` (`stateColor`) | ★ |
| Ideal-head ring | Dashed circle showing where your head should be (from calibration) + legend under the preview | ✅ | `draw.ts`, `views/live.ts` | ★ |
| Angle labels on the body | Pills "barki 4°", "głowa 7°", "szyja −18%" that turn amber/red past the threshold | ✅ | `draw.ts` | · |
| Shoulder, eye and ear lines | Shoulder line, eye line, dotted ear line, joint dots | ✅ | `draw.ts` | |
| Framing hints | "Nie widzę barków – odsuń się…", "Twarz jest zasłonięta…" on the preview | ✅ | `views/live.ts` | |
| Camera states | Calm messages for camera starting / busy (Teams, Zoom) / denied / missing / paused | ✅ | `views/live.ts` (`CAMERA_MSG`) | · |
| True head pose (pitch/yaw/roll) | More accurate "head forward"; turning to a 2nd screen isn't punished | ✅ | `core/headPose.ts` (MP3) | |
| Shoulder gate | Score doesn't jump when a chair/hoodie/hand hides a shoulder | ✅ | `core/shoulderGate.ts` (A10) | |
| Better pose model | `pose_landmarker_full` instead of lite: steadier shoulders/ears | ✅ | `main/models.ts` (MP5) | |
| Camera tab-switch freeze fix | Preview stays live after Na żywo → Statystyki → Na żywo | ✅ | `views/live.ts` `mount()` (MP1) | |
| Neon face mesh (cyan tessellation, glowing eyes/iris) | The wow shot: glowing face web on a darkened video | 📋 MP7 / C1 (Mateusz) | PLAN MP7 | ★ |
| Neon skeleton + calibrated "ghost" | Magenta shoulders/neck, ear–shoulder arc, dotted ghost posture | 📋 C2 | PLAN C2 | ★ |
| Blink ripple, score colour shift | Eyes ripple on blink; glow shifts green → amber → red | 📋 C3 | PLAN C3 | · |
| Smooth 60 fps overlay | Lines glide instead of 8 Hz jumps | 📋 MP9 (Mateusz) | PLAN MP9 | |
| Pause/resume freeze fix | Preview returns within 2 s after Wstrzymaj → Wznów | 🚧 Mateusz | PLAN MP2 | |
| Higher camera resolution 1280×720 | Better blinks/glasses | 📋 MP4 | PLAN MP4 | |
| Colourful body strands | — | ✂️ MP8 (dropped) | PLAN MP8 | |
| Hand landmarker | — | ✂️ MP10 | PLAN MP10 | |

## Posture scoring & alerts
| Feature | What the user sees | Status | Where | Pitch |
|---|---|---|---|---|
| Score 0–100 vs *your* calibration | "postawa 82/100" + state word "Siedzisz prosto / Postawa się psuje / Zła postawa" | ✅ | `core/scoring.ts`, `views/live.ts` | ★ |
| 7 issues detected | Head forward, slouch, head tilt, shoulder tilt, too close to screen, torso twist, long stillness | ✅ | `core/scoring.ts` (`ISSUE_DEFS`), `core/metrics.ts` | · |
| One tip "right now" | e.g. "Cofnij brodę…" for the top issue; "Tak trzymaj." when good | ✅ | `views/live.ts`, `core/coach.ts` (`ISSUE_TIP`) | ★ |
| Deviation bars per issue | Under "Szczegóły pomiaru": % / ° deviation + ok/warn/bad bar | ✅ | `views/live.ts` | · |
| Calm alerts (no nagging) | Notification only after 30 s of bad posture, hysteresis, max 1 per 5 min; reaching for a mug doesn't trigger | ✅ | `core/scoring.ts`, `main/main.ts` `notify()`, `shared/types.ts` defaults | ★ |
| In-app toast mirrors the alert | Toast with issue + tip when the window is focused | ✅ | `renderer/app.ts` `onAlert` | |
| Sensitivity slider | "Czułość oceny" scales all thresholds 0.7–1.4 | ✅ | `views/settings.ts` | |
| "Why now" explanations | "Przerwa teraz, bo: PERCLOS 18%, 52 min bez przerwy" on alerts/breaks | 📋 A3 (Kacper) + B3 (Marcin) | PLAN A3, B3 | ★ |

## Fatigue & eyes
| Feature | What the user sees | Status | Where | Pitch |
|---|---|---|---|---|
| Fatigue index 0–100% | Fatigue % + word + meter with 40/70 ticks (in "Szczegóły pomiaru") | ✅ | `core/fatigue.ts`, `views/live.ts` | · |
| Blinks, PERCLOS, yawns | "14 mrugnięć/min, oczy zamknięte 6% czasu, 2 ziewnięcia w 10 min" | ✅ | `core/fatigue.ts` (`EyeAnalyzer`) | · |
| Fatigue advice | One line of advice by level and blink rate | ✅ | `core/coach.ts` `fatigueAdvice` | |
| Looking at keyboard ≠ tired | Eye closures > 3 s are ignored for PERCLOS | ✅ | `core/fatigue.ts` | |
| Unreliable face → reweighting | Glare / low light / < 12 fps: weights move to other components | ✅ | `core/fatigue.ts` | |
| Battery saver | Face loop drops 25 → 15 fps on battery; off → 8 fps | ✅ | `renderer/analyzer.ts` | |
| Glasses mode for blinks | Blink count within ±20% with glasses | 📋 MP6 (Kacper) | PLAN MP6 | |

## Bateria energy & forecast
| Feature | What the user sees | Status | Where | Pitch |
|---|---|---|---|---|
| "Bateria" one number | Big "73%" at the top of the live panel with a coloured meter | ✅ | `core/energy.ts` (A6), `views/live.ts` | ★ |
| Fused inputs | Fatigue 50%, posture 25%, time since break 15% | ✅ | `core/energy.ts` | · |
| Forecast | "Za ok. 40 min spadnie poniżej 30% – zaplanuj przerwę wcześniej." | ✅ | `core/energy.ts` `minutesUntilLow`, `views/live.ts` | ★ |
| Sparkline + prediction badge (live + widget) | Small trend line next to Bateria | 📋 C5 | PLAN C5 | · |
| Bateria recharges after a verified exercise | Number visibly goes up after chin tucks | 📋 A5 + C6 | PLAN A5, C6 | ★ |

## Breaks & exercises
| Feature | What the user sees | Status | Where | Pitch |
|---|---|---|---|---|
| Break engine | 20-20-20 every 20 min, micro every 30 min (or after 3 alerts in 15 min), movement every 55 min | ✅ | `core/breakEngine.ts` | · |
| Adaptive breaks | Earlier break when fatigue rises or the posture score keeps falling | ✅ | `core/breakEngine.ts`, `core/coach.ts` `BREAK_REASON` | · |
| Leaving the desk counts | Away > 2 min = break; > 20 s = eye break | ✅ | `core/breakEngine.ts` | · |
| Next-break line | "Przerwa ruchowa za 12 min" + "Od ostatniej przerwy: 47 min" + "Zrób przerwę teraz" | ✅ | `views/live.ts` | · |
| Break overlay | Figure, steps, ring timer, reason line, Start / Zrobione / "Odłóż o 5 min" | ✅ | `renderer/overlays.ts` `openBreakOverlay` | ★ |
| Click a notification → break opens | Break notification opens the exercise | ✅ | `main/main.ts` `notify()` | |
| 8 exercises picked for your top issue | Chin tuck, shoulder blades, shoulder rolls, neck stretch, torso twist, chest opener, 20-20-20, walk | ✅ | `core/coach.ts` `EXERCISES`, `pickExercise` | · |
| Exercise library screen | "Ćwiczenia" list with SVG figures, duration, "Pomaga przy…", Zacznij | ✅ | `views/exercises.ts`, `renderer/figures.ts` | |
| Camera-verified reps | "Cofanie brody 5/8 ✓" counted by the camera | 📋 A4 (Kacper) + C6 (Mateusz) | PLAN A4, C6 | ★ |

## Calibration
| Feature | What the user sees | Status | Where | Pitch |
|---|---|---|---|---|
| Two-step calibration | "Krok 1 z 2: najprościej" then "Krok 2 z 2: jak zwykle" → personal range | ✅ | `core/calibration.ts`, `overlays.ts` `openCalibration` (A11) | · |
| Live checks during calibration | Timer only runs when posture is right; "Unieś głowę…", "Wyrównaj barki." | ✅ | `core/calibration.ts` `checkCalibrationPose` | · |
| Drift hints | Toast "Dziś siedzisz prościej niż przy kalibracji…" / "Kamera lub krzesło chyba się zmieniły…" + Skalibruj | ✅ | `core/calibration.ts`, `renderer/app.ts` | |
| No-calibration CTA | "Najpierw pokaż mi…" + "Skalibruj postawę" on the preview | ✅ | `views/live.ts` | |
| Silhouette mockup guide | Outline of where to sit during calibration | 🚧 Kacper | — | · |

## Quick glance (tray, menu bar, widget)
| Feature | What the user sees | Status | Where | Pitch |
|---|---|---|---|---|
| Tray icon changes colour with posture | Green / amber / red / grey icon in the tray / menu bar | ✅ | `main/main.ts` `trayIcon`, `assets/tray-*.png` | ★ |
| Tray tooltip + menu header | "Postura – postawa 82/100, zmęczenie 31%" | ✅ | `main/main.ts` `updateTray` | · |
| Tray menu | Pokaż okno, Statystyki, Kalibracja, Wstrzymaj/Wznów, Mini-widget ☑, Zakończ | ✅ | `main/main.ts` | · |
| Lives in the tray | Closing the window keeps analysis running; no Dock icon on macOS | ✅ | `main/main.ts` | · |
| Mini-widget always on top | Small frameless window: score, "Prosto / Popraw się / Zła postawa", "zmęczenie 31%" | ✅ | `main/main.ts` `toggleWidget`, `renderer/widget.ts` | ★ |
| Menu-bar posture score (macOS) | Score number next to the tray icon | 🚧 Mateusz | — | ★ |
| Colour pill widget that fades when posture is good | Pill disappears when you sit well, lights up when not | 🚧 Mateusz | — | ★ |
| Tray quick menu | Bateria, fatigue, time since break + "Przerwa teraz", "Pauza 30 min" | 🚧 Mateusz | — | · |

## Stats & rhythm
| Feature | What the user sees | Status | Where | Pitch |
|---|---|---|---|---|
| Today chart | 5-min posture line, the 80 "good" line, gaps = away from desk | ✅ | `views/stats.ts` | · |
| Best hours heat map | Weekday × hour form map + "Najlepsze godziny: 9–11; spadek ok. 14:00" | ✅ | `core/insights.ts`, `views/stats.ts` | ★ |
| Form score | No fatigue 45% + posture 35% + keyboard/mouse tempo 20% | ✅ | `core/insights.ts` `formScore` | |
| "Co poprawić na stałe" | Top issues by share of bad-posture time over 7 days | ✅ | `views/stats.ts` | · |
| End-of-day summary | Notification after work hours: good-posture %, breaks, top issue, tip for tomorrow | ✅ | `main/main.ts` `maybeEndOfDay` | · |
| Keyboard/mouse tempo | Counts only events per minute, never keys | ✅ | `main/activity.ts` (off by default, A12) | · |
| Team view (our 4 people's 24 h) | Pitch hook: "this is our team's last 24 h" | 📋 B5 (Marcin) + D0.3 export | PLAN B5 | ★ |
| AI coach summary | Daily summary from numbers only | 📋 B4 (only if AI dual entry) | PLAN B4 | |
| "What if" screen, phone health import | — | ✂️ B7, B6 | PLAN | |

## Care path (doctor report, NFZ)
| Feature | What the user sees | Status | Where | Pitch |
|---|---|---|---|---|
| Persistent-pattern detection | "10 of last 14 days with neck strain" triggers the report | 📋 A7 | PLAN A7 | ★ |
| Doctor report screen + PDF | 1-page 14-day summary, top issues, fatigue, sleep, questions for the doctor | 📋 B1 (Marcin) | PLAN B1 | ★ |
| NFZ path card | GP vs physio vs eye doctor, TIP 800 190 590, red flags → 112, no diagnoses | 🚧 Marcin | PLAN B2 | ★ |
| Physio disclaimer | "Przy bólu lub drętwieniu skonsultuj się z fizjoterapeutą." on Ćwiczenia | ✅ | `views/exercises.ts` | |

## Privacy & offline
| Feature | What the user sees | Status | Where | Pitch |
|---|---|---|---|---|
| Frames never saved or sent | Privacy note in Settings; DB holds numbers only | ✅ | `main/db.ts`, `views/settings.ts` | ★ |
| "Usuń moje dane" | Two-click wipe of history, calibration | ✅ | `main/db.ts` `wipe`, `views/settings.ts` | · |
| Auto-pause when camera busy / screen locked | Teams/Zoom takes the camera → pauses and resumes alone | ✅ | `renderer/analyzer.ts`, `main/main.ts` (`powerMonitor`) | · |
| Wstrzymaj turns the camera off | Pause from the app or tray | ✅ | `renderer/app.ts`, `main/main.ts` | |
| Models bundled (works with wifi off) | No download on first run | 📋 A1 (Kacper) | PLAN A1 | |

## Settings & UX
| Feature | What the user sees | Status | Where | Pitch |
|---|---|---|---|---|
| Simple first screen | Bateria + one tip + next break; details one click away | ✅ | `views/live.ts` (A12) | · |
| Basic + "Zaawansowane" settings | Camera picker, notifications, work hours, widget, autostart; advanced: mirror, alert timing, break intervals, face analysis, tempo | ✅ | `views/settings.ts` | |
| Nie przeszkadzać / only work hours / sound | Silences notifications; analysis continues | ✅ | `main/main.ts` `notify()` | · |
| Autostart hidden in the tray | Starts with the system, no window | ✅ | `main/main.ts` `applySettings` | |
| Polish UI, 24 h formats | Whole app in Polish | ✅ | `main/main.ts` (`lang pl-PL`) | |
| Empty / error states for every view | Calm "no data yet" screens | 📋 C8 | PLAN C8 (Stats has one ✅) | |
| Visual pass (palette, type, projector) | — | 📋 C7 | PLAN C7 | |

## Demo mode & packaging
| Feature | What the user sees | Status | Where | Pitch |
|---|---|---|---|---|
| `npm run demo` | Synthetic figure that slouches now and then; no camera needed | ✅ | `renderer/analyzer.ts`, `package.json` | · |
| `npm run seed-demo` / `demo:stats` | 12 days of sample data in `./demo-data` (separate from real data) | ✅ | `scripts/seed-demo.mjs` | · |
| Scripted 3-min story offline | Slouch → why → exercise → recovery → stats → report | 📋 I2 (Mateusz) | PLAN I2 | ★ |
| Demo intensity hotkey | Brighter glow, bigger numbers for the projector | 📋 C4 | PLAN C4 | |
| Installers | `dist:mac` .dmg, `dist:win` .exe | ✅ scripts / 📋 I3 tested build | `package.json`, PLAN I3 | · |
| Unit tests for the core | `npm test` (metrics, alerts, blinks, breaks, stats, energy) | ✅ | `test/` | · |

## Pitch assets
| Asset | Status | Where |
|---|---|---|
| Pitch script PL + EN, timed < 3:00 | 📋 D5 (Bartłomiej) | PLAN D5 |
| Slides ≤ 10 (incl. 4 pillars, care path, privacy, vs Straighty / Rest & Blink, BHP business) | 📋 D6, D3, D4 | PLAN D6 |
| 3-min video from demo mode | 📋 D7 | PLAN D7 |
| Screenshot pack 1920×1080 + 10 s neon clip | 📋 C9 | PLAN C9 |
| HackTribe text + `AI_USAGE.md` | 📋 D8 | PLAN D8 |
| Team 24 h data export (hook) | 📋 Roadmap 0.3 | ROADMAP Phase 0 |

## Known gaps / don't claim yet
- **"Works offline from first start"**: false today. Models (~13 MB) download on first run from Google storage (`main/models.ts`). Claim only after A1 (N1) passes with wifi off.
- **Neon face mesh / skeleton**: not drawn yet. Today's overlay is the spine line, shoulder/eye lines, ring and labels (`draw.ts`). Don't show mesh mockups as the real app before MP7/C2.
- **Alert speed**: the default needs 30 s of bad posture plus ~12 s smoothing, so about **40 s**. In a live demo, lower "Powiadom po…" in Zaawansowane or use demo mode; don't say "instantly".
- **Blinks with glasses**: unreliable (showed 0/min for Mateusz). Don't claim blink accuracy until MP6.
- **"Why now"** today is only a generic reason line on the break overlay (`BREAK_REASON`); posture alerts show issue + tip without evidence numbers. A3/B3 add the evidence.
- **Camera-verified exercises, Bateria recharge, doctor report, NFZ card, Team view**: not in main yet.
- **Pause → resume freeze** (MP2) not yet verified fixed; avoid pausing on stage.
- **Keyboard/mouse tempo** is off by default (needs macOS Accessibility), so "form" uses fatigue + posture unless enabled.
- **Medical claims**: habit tool, not a diagnosis. Never say "diagnoses" or "detects disease".
