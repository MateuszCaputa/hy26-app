// Widok „Ustawienia”: zmiany zapisują się od razu.
import type { AppCtx } from '../app';
import type { Nudge, Settings } from '../../shared/types';
import { ISSUE_LABEL, ISSUE_TIP, exerciseById, pickExercise } from '../../core/coach';
import { h } from '../dom';

type Key = keyof Settings;

export async function renderSettings(view: HTMLElement, ctx: AppCtx): Promise<void> {
  const api = window.postura;
  const saved = h('span', { class: 'saved', 'aria-live': 'polite' });
  let timer: number | null = null;
  const set = <K extends Key>(k: K, v: Settings[K]) => {
    const next = { ...ctx.settings, [k]: v };
    void ctx.saveSettings(next).then(() => {
      saved.textContent = 'Zapisano';
      if (timer) clearTimeout(timer);
      timer = window.setTimeout(() => (saved.textContent = ''), 1800);
    });
  };

  const toggle = (k: Key, label: string, hint?: string) => {
    const id = `s-${k}`;
    return h('div', { class: 'field toggle' },
      h('input', { type: 'checkbox', id, checked: Boolean(ctx.settings[k]), onchange: (e: Event) => set(k, (e.target as HTMLInputElement).checked as never) }),
      h('label', { for: id }, label, hint ? h('span', { class: 'hint' }, hint) : null),
    );
  };
  const num = (k: Key, label: string, unit: string, min: number, max: number) => {
    const id = `s-${k}`;
    return h('div', { class: 'field' },
      h('label', { for: id }, label),
      h('span', { class: 'num' },
        h('input', { type: 'number', id, min: String(min), max: String(max), value: String(ctx.settings[k]),
          onchange: (e: Event) => {
            const v = Math.min(max, Math.max(min, Number((e.target as HTMLInputElement).value) || min));
            (e.target as HTMLInputElement).value = String(v);
            set(k, v as never);
          } }),
        h('span', { class: 'unit' }, unit),
      ),
    );
  };
  // Kamera
  const camSelect = h('select', { id: 's-cam', onchange: (e: Event) => set('cameraId', (e.target as HTMLSelectElement).value) },
    h('option', { value: '' }, 'Domyślna kamera'));
  try {
    const devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
    devs.forEach((d, i) => camSelect.append(h('option', { value: d.deviceId, selected: d.deviceId === ctx.settings.cameraId }, d.label || `Kamera ${i + 1}`)));
  } catch {
    /* brak dostępu do listy urządzeń */
  }

  // Czułość: suwak 0.7–1.4, w lewo = bardziej czuła.
  const sensVal = h('span', { class: 'hint' });
  const sensText = (v: number) => (v < 0.9 ? 'bardziej czuła' : v > 1.15 ? 'mniej czuła' : 'standardowa');
  sensVal.textContent = sensText(ctx.settings.sensitivity);
  const sens = h('div', { class: 'field' },
    h('label', { for: 's-sens' }, 'Czułość oceny', sensVal),
    h('input', { type: 'range', id: 's-sens', min: '0.7', max: '1.4', step: '0.05', value: String(ctx.settings.sensitivity),
      oninput: (e: Event) => (sensVal.textContent = sensText(Number((e.target as HTMLInputElement).value))),
      onchange: (e: Event) => set('sensitivity', Number((e.target as HTMLInputElement).value)) }),
  );

  view.append(
    h('div', { class: 'page settings' },
      h('div', { class: 'page-head' }, h('h1', null, 'Ustawienia'), saved),
      // Na wierzchu tylko to, co zmienia większość osób. Strojenie progów i analizy – w „Zaawansowanych”.
      group('Kamera i kalibracja', [
        h('div', { class: 'field' }, h('label', { for: 's-cam' }, 'Kamera'), camSelect),
        h('div', { class: 'field' }, h('span', null, 'Wzorzec prostej postawy'),
          h('button', { class: 'btn small', onclick: () => ctx.startCalibration() }, ctx.calibration ? 'Skalibruj ponownie' : 'Skalibruj')),
      ]),
      group('Powiadomienia', [
        toggle('doNotDisturb', 'Nie przeszkadzać', 'wycisza wszystkie powiadomienia, analiza działa dalej'),
        toggle('soundAlerts', 'Dźwięk powiadomień'),
        toggle('systemNotifications', 'Powiadomienia systemowe', 'gdy mini-widget jest wyłączony; z widgetem przypomnienia wysuwają się spod niego')
      ]),
      group('Aplikacja', [
        toggle('miniWidget', 'Mini-widget z wynikiem na ekranie'),
        h('div', { class: 'field' },
          h('label', { for: 's-widgetStyle' }, 'Wygląd mini-widgetu'),
          h('select', { id: 's-widgetStyle', onchange: (e: Event) => set('widgetStyle', (e.target as HTMLSelectElement).value as Settings['widgetStyle']) },
            h('option', { value: 'card', selected: ctx.settings.widgetStyle === 'card' }, 'Karta: wynik, stan, zmęczenie'),
            h('option', { value: 'pill', selected: ctx.settings.widgetStyle === 'pill' }, 'Pigułka: sama liczba'),
          ),
        ),
        toggle('autostart', 'Uruchamiaj z systemem', 'start w zasobniku, bez okna'),
      ]),
      h('section', { class: 'block group' },
        h('details', { class: 'adv' },
          h('summary', null, 'Zaawansowane'),
          h('div', { class: 'fields' },
            sens,
            toggle('mirror', 'Odbicie lustrzane podglądu'),
            num('alertDelaySec', 'Powiadom po złej postawie trwającej', 's', 10, 300),
            num('alertCooldownMin', 'Najwyżej jedno powiadomienie na', 'min', 1, 60),
            num('eyeBreakMin', 'Przerwa dla oczu (20-20-20) co', 'min', 10, 60),
            num('microBreakMin', 'Mikroprzerwa co', 'min', 15, 120),
            num('moveBreakMin', 'Przerwa ruchowa co', 'min', 30, 180),
            h('p', { class: 'fine' }, 'Wyjście z kadru na ponad 2 min liczy się jako przerwa. Przy rosnącym zmęczeniu przerwa może pojawić się wcześniej.'),
            toggle('faceAnalysis', 'Mrugnięcia i zmęczenie z obrazu twarzy', 'wymaga ok. 25 klatek/s; wyłącz, by oszczędzać baterię'),
          ),
        ),
      ),
      previewGroup(ctx),
      group('Dane', [
        h('p', { class: 'fine' }, 'Obraz z kamery nie jest zapisywany ani wysyłany. Baza zawiera tylko liczby: wyniki co minutę i zdarzenia.'),
        h('button', { class: 'btn danger small', onclick: async (e: Event) => {
          const b = e.currentTarget as HTMLButtonElement;
          if (b.dataset.confirm !== '1') {
            b.dataset.confirm = '1';
            b.textContent = 'Kliknij ponownie, aby usunąć';
            return;
          }
          await api?.wipeData();
          ctx.calibration = null;
          b.textContent = 'Usunięto';
          ctx.toast('Dane usunięte. Zrób nową kalibrację.', { label: 'Skalibruj', run: () => ctx.startCalibration() });
        } }, 'Usuń moje dane'),
      ]),
    ),
  );
}

/** Podgląd powiadomień: każdy rodzaj okienka na żądanie, żeby zobaczyć, jak wygląda. */
function previewGroup(ctx: AppCtx): HTMLElement {
  const api = window.postura;
  const NUDGES: Record<string, Nudge> = {
    eye: { kind: 'eye', title: 'Spójrz w dal', body: 'Przez 20 s patrz na coś odległego (ok. 6 m).', seconds: 20 },

    posture: { kind: 'posture', title: ISSUE_LABEL.slouch, body: ISSUE_TIP.slouch },
  };
  const btn = (label: string, run: () => void) => h('button', { class: 'btn small', type: 'button', onclick: run }, label);
  // Przerwy: za każdym razem losowe ćwiczenie z listy – „Start” otwiera właśnie je.
  const breakNudge = (kind: 'micro' | 'move', title: string): Nudge => {
    const id = pickExercise(kind, null, Math.random() * 1e6);
    return { kind: 'break', title, body: exerciseById(id).name, exerciseId: id };
  };
  const pick = (k: string): Nudge => (k === 'micro' ? breakNudge('micro', 'Mikroprzerwa') : k === 'move' ? breakNudge('move', 'Przerwa ruchowa') : NUDGES[k]);
  const corner = (k: string) => () => api?.testNotify({ target: 'corner', nudge: pick(k) });
  const system = (k: string) => () => api?.testNotify({ target: 'system', nudge: pick(k) });
  return group('Podgląd powiadomień', [
    h('p', { class: 'fine' }, 'Pokaż od razu, jak wygląda każde powiadomienie (bez limitów i godzin pracy).'),
    h('p', null, 'Okienko pod widgetem'),
    h('div', { class: 'row' }, btn('Oczy 20-20-20', corner('eye')), btn('Mikroprzerwa', corner('micro')), btn('Przerwa ruchowa', corner('move')), btn('Postawa', corner('posture'))),
    h('p', null, 'Powiadomienie systemowe'),
    h('div', { class: 'row' }, btn('Postawa', system('posture')), btn('Przerwa', system('micro'))),
    h('p', null, 'W oknie aplikacji'),
    h('div', { class: 'row' },
      btn('Komunikat na dole', () => ctx.toast('Mikroprzerwa: czas na chwilę odpoczynku.', { label: 'Zacznij przerwę', run: () => ctx.startBreak() })),
      btn('Ekran przerwy', () => ctx.startBreak()),
    ),
  ]);
}

function group(title: string, children: (HTMLElement | null)[]): HTMLElement {
  return h('section', { class: 'block group' }, h('h2', null, title), h('div', { class: 'fields' }, children));
}
