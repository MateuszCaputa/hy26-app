// Widok „Ustawienia”: zmiany zapisują się od razu.
import type { AppCtx } from '../app';
import type { Nudge, Settings } from '../../shared/types';
import { ISSUE_LABEL, ISSUE_TIP, exerciseById, pickExercise } from '../../core/coach';
import { h } from '../dom';
import { tr } from '../../shared/i18n';

type Key = keyof Settings;

export async function renderSettings(view: HTMLElement, ctx: AppCtx): Promise<void> {
  const api = window.postura;
  const saved = h('span', { class: 'saved', 'aria-live': 'polite' });
  let timer: number | null = null;
  const set = <K extends Key>(k: K, v: Settings[K]) => {
    const next = { ...ctx.settings, [k]: v };
    void ctx.saveSettings(next).then(() => {
      saved.textContent = tr('Zapisano');
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
    h('option', { value: '' }, tr('Domyślna kamera')));
  try {
    const devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
    devs.forEach((d, i) => camSelect.append(h('option', { value: d.deviceId, selected: d.deviceId === ctx.settings.cameraId }, d.label || `Kamera ${i + 1}`)));
  } catch {
    /* brak dostępu do listy urządzeń */
  }

  // Czułość: suwak 0.7–1.4, w lewo = bardziej czuła.
  const sensVal = h('span', { class: 'hint' });
  const sensText = (v: number) => (v < 0.9 ? tr('bardziej czuła') : v > 1.15 ? tr('mniej czuła') : 'standardowa');
  sensVal.textContent = sensText(ctx.settings.sensitivity);
  const sens = h('div', { class: 'field' },
    h('label', { for: 's-sens' }, tr('Czułość oceny'), sensVal),
    h('input', { type: 'range', id: 's-sens', min: '0.7', max: '1.4', step: '0.05', value: String(ctx.settings.sensitivity),
      oninput: (e: Event) => (sensVal.textContent = sensText(Number((e.target as HTMLInputElement).value))),
      onchange: (e: Event) => set('sensitivity', Number((e.target as HTMLInputElement).value)) }),
  );

  // Podgląd powiadomień to narzędzie do pokazu: widoczny dopiero po włączeniu trybu prezentacji.
  const preview = previewGroup(ctx);
  preview.hidden = !ctx.analyzer.presentationMode;

  view.append(
    h('div', { class: 'page settings' },
      h('div', { class: 'page-head' }, h('h1', null, tr('Ustawienia')), saved),
      // Na wierzchu tylko to, co zmienia większość osób. Strojenie progów i analizy – w „Zaawansowanych”.
      group(tr('Kamera i kalibracja'), [
        h('div', { class: 'field' }, h('label', { for: 's-cam' }, tr('Kamera')), camSelect),
        h('div', { class: 'field' }, h('span', null, tr('Wzorzec prostej postawy')),
          h('button', { class: 'btn small', onclick: () => ctx.startCalibration() }, ctx.calibration ? tr('Skalibruj ponownie') : tr('Skalibruj'))),
      ]),
      group(tr('Powiadomienia'), [
        toggle('doNotDisturb', tr('Nie przeszkadzać'), tr('wycisza wszystkie powiadomienia, analiza działa dalej')),
        toggle('soundAlerts', tr('Dźwięk powiadomień')),
        toggle('systemNotifications', tr('Powiadomienia systemowe'), tr('gdy mini-widget jest wyłączony; z widgetem przypomnienia wysuwają się spod niego'))
      ]),
      group(tr('Aplikacja'), [
        h('div', { class: 'field' },
          h('label', { for: 's-language' }, tr('Język / Language')),
          h('select', {
            id: 's-language',
            // Zmiana języka: proces główny przeładuje okna (z ?lang=…) i odświeży widget oraz menu w pasku.
            onchange: (e: Event) => set('language', (e.target as HTMLSelectElement).value as Settings['language']),
          },
            h('option', { value: 'pl', selected: ctx.settings.language !== 'en' }, tr('Polski')),
            h('option', { value: 'en', selected: ctx.settings.language === 'en' }, 'English'),
          ),
        ),
        toggle('miniWidget', tr('Mini-widget z wynikiem na ekranie')),
        h('div', { class: 'field' },
          h('label', { for: 's-widgetStyle' }, tr('Wygląd mini-widgetu')),
          h('select', { id: 's-widgetStyle', onchange: (e: Event) => set('widgetStyle', (e.target as HTMLSelectElement).value as Settings['widgetStyle']) },
            h('option', { value: 'card', selected: ctx.settings.widgetStyle === 'card' }, tr('Karta: wynik, stan, zmęczenie')),
            h('option', { value: 'pill', selected: ctx.settings.widgetStyle === 'pill' }, tr('Pigułka: sama liczba')),
          ),
        ),
        toggle('autostart', tr('Uruchamiaj z systemem'), tr('start w zasobniku, bez okna')),
      ]),
      h('section', { class: 'block group' },
        h('details', { class: 'adv' },
          h('summary', null, tr('Zaawansowane')),
          h('div', { class: 'fields' },
            sens,
            toggle('mirror', tr('Odbicie lustrzane podglądu')),
            num('alertDelaySec', tr('Powiadom po złej postawie trwającej'), 's', 10, 300),
            num('alertCooldownMin', tr('Najwyżej jedno powiadomienie na'), 'min', 1, 60),
            num('eyeBreakMin', tr('Przerwa dla oczu (20-20-20) co'), 'min', 10, 60),
            num('microBreakMin', tr('Mikroprzerwa co'), 'min', 15, 120),
            num('moveBreakMin', tr('Przerwa ruchowa co'), 'min', 30, 180),
            h('p', { class: 'fine' }, tr('Wyjście z kadru na ponad 2 min liczy się jako przerwa. Przy rosnącym zmęczeniu przerwa może pojawić się wcześniej.')),
            toggle('faceAnalysis', tr('Mrugnięcia i zmęczenie z obrazu twarzy'), tr('wymaga ok. 25 klatek/s; wyłącz, by oszczędzać baterię')),
          ),
        ),
      ),
      // Tryb prezentacji: nie zapisujemy go w ustawieniach – działa tylko do zamknięcia aplikacji.
      group(tr('Prezentacja'), [
        h('div', { class: 'field toggle' },
          h('input', { type: 'checkbox', id: 's-presentation', checked: ctx.analyzer.presentationMode,
            onchange: (e: Event) => {
              const on = (e.target as HTMLInputElement).checked;
              ctx.analyzer.setPresentationMode(on);
              preview.hidden = !on;
              ctx.toast(on ? tr('Symulacja zmęczenia włączona: wynik rośnie przez ok. 45 s i jest oznaczony „SYMULACJA”.') : tr('Symulacja wyłączona – wracam do prawdziwych pomiarów.'));
            } }),
          h('label', { for: 's-presentation' }, tr('Tryb prezentacji: symulacja zmęczenia'),
            h('span', { class: 'hint' }, tr('rzadsze mruganie, przymykanie oczu i ziewanie narastają przez ok. 45 s; wynik oznaczony „SYMULACJA”, nie trafia do statystyk; odsłania podgląd powiadomień; wyłącza się po zamknięciu aplikacji'))),
        ),
      ]),
      preview,
      group(tr('Dane'), [
        h('p', { class: 'fine' }, tr('Obraz z kamery nie jest zapisywany ani wysyłany. Baza zawiera tylko liczby: wyniki co minutę i zdarzenia.')),
        h('button', { class: 'btn danger small', onclick: async (e: Event) => {
          const b = e.currentTarget as HTMLButtonElement;
          if (b.dataset.confirm !== '1') {
            b.dataset.confirm = '1';
            b.textContent = tr('Kliknij ponownie, aby usunąć');
            return;
          }
          await api?.wipeData();
          ctx.calibration = null;
          b.textContent = tr('Usunięto');
          ctx.toast(tr('Dane usunięte. Zrób nową kalibrację.'), { label: tr('Skalibruj'), run: () => ctx.startCalibration() });
        } }, tr('Usuń moje dane')),
      ]),
    ),
  );
}

/** Podgląd powiadomień: każdy rodzaj okienka na żądanie, żeby zobaczyć, jak wygląda. */
function previewGroup(ctx: AppCtx): HTMLElement {
  const api = window.postura;
  const NUDGES: Record<string, Nudge> = {
    eye: { kind: 'eye', title: tr('Spójrz w dal'), body: tr('Przez 20 s patrz na coś odległego (ok. 6 m).'), seconds: 20 },

    posture: { kind: 'posture', title: ISSUE_LABEL.slouch, body: ISSUE_TIP.slouch },
  };
  const btn = (label: string, run: () => void) => h('button', { class: 'btn small', type: 'button', onclick: run }, label);
  // Przerwy: za każdym razem losowe ćwiczenie z listy – „Start” otwiera właśnie je.
  const breakNudge = (kind: 'micro' | 'move', title: string): Nudge => {
    const id = pickExercise(kind, null, Math.random() * 1e6);
    return { kind: 'break', title, body: exerciseById(id).name, exerciseId: id };
  };
  const pick = (k: string): Nudge => (k === 'micro' ? breakNudge('micro', tr('Mikroprzerwa')) : k === 'move' ? breakNudge('move', tr('Przerwa ruchowa')) : NUDGES[k]);
  const corner = (k: string) => () => api?.testNotify({ target: 'corner', nudge: pick(k) });
  const system = (k: string) => () => api?.testNotify({ target: 'system', nudge: pick(k) });
  return group(tr('Podgląd powiadomień'), [
    h('p', { class: 'fine' }, tr('Pokaż od razu, jak wygląda każde powiadomienie (bez limitów i godzin pracy).')),
    h('p', null, tr('Okienko pod widgetem')),
    h('div', { class: 'row' }, btn(tr('Oczy 20-20-20'), corner('eye')), btn(tr('Mikroprzerwa'), corner('micro')), btn(tr('Przerwa ruchowa'), corner('move')), btn(tr('Postawa'), corner('posture'))),
    h('p', null, tr('Powiadomienie systemowe')),
    h('div', { class: 'row' }, btn(tr('Postawa'), system('posture')), btn(tr('Przerwa'), system('micro'))),
    h('p', null, tr('W oknie aplikacji')),
    h('div', { class: 'row' },
      btn(tr('Komunikat na dole'), () => ctx.toast(tr('Mikroprzerwa: czas na chwilę odpoczynku.'), { label: tr('Zacznij przerwę'), run: () => ctx.startBreak() })),
      btn(tr('Ekran przerwy'), () => ctx.startBreak()),
    ),
  ]);
}

function group(title: string, children: (HTMLElement | null)[]): HTMLElement {
  return h('section', { class: 'block group' }, h('h2', null, title), h('div', { class: 'fields' }, children));
}
