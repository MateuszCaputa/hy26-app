// Widok „Ustawienia”: zmiany zapisują się od razu.
import type { AppCtx } from '../app';
import type { Settings } from '../../shared/types';
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
  const time = (k: 'workStart' | 'workEnd', label: string) =>
    h('div', { class: 'field' },
      h('label', { for: `s-${k}` }, label),
      h('input', { type: 'time', id: `s-${k}`, value: ctx.settings[k], onchange: (e: Event) => set(k, (e.target as HTMLInputElement).value) }),
    );

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

  // Aktywność klawiatury i myszy – status modułu.
  const actStatus = h('p', { class: 'fine' });
  const refreshAct = async () => {
    const s = await api?.activityStatus();
    if (!s) return;
    actStatus.textContent = !ctx.settings.activityTracking
      ? 'Wyłączone.'
      : s.running
        ? 'Działa: zapisuję tylko liczbę naciśnięć i ruchów myszy na minutę, nigdy treść.'
        : `Nie działa${s.error ? ` (${s.error})` : ''}. ${ctx.init.platform === 'darwin' ? 'Na macOS nadaj Posturze uprawnienie w Ustawieniach systemowych → Prywatność → Dostępność.' : ''}`;
  };
  void refreshAct();

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
        toggle('onlyWorkHours', 'Powiadamiaj tylko w godzinach pracy'),
        time('workStart', 'Początek pracy'),
        time('workEnd', 'Koniec pracy (podsumowanie dnia)'),
        toggle('soundAlerts', 'Dźwięk powiadomień'),
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
            toggle('activityTracking', 'Tempo pracy z klawiatury i myszy', 'dokładniejsze „godziny formy”; na macOS wymaga uprawnienia Dostępności'),
            actStatus,
          ),
        ),
      ),
      garminGroup(ctx),
      group('Dane', [
        h('p', { class: 'fine' }, 'Obraz z kamery nie jest zapisywany ani wysyłany. Baza zawiera tylko liczby: wyniki co minutę, zdarzenia i dane z Garmina.'),
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
  // Odśwież status klawiatury po zmianie przełącznika.
  view.querySelector('#s-activityTracking')?.addEventListener('change', () => setTimeout(() => void refreshAct(), 300));
}

function group(title: string, children: (HTMLElement | null)[]): HTMLElement {
  return h('section', { class: 'block group' }, h('h2', null, title), h('div', { class: 'fields' }, children));
}

function garminGroup(ctx: AppCtx): HTMLElement {
  const api = window.postura;
  const body = h('div', { class: 'fields' });
  const msg = h('p', { class: 'fine', 'aria-live': 'polite' });

  const renderConnected = (email: string | null) => {
    body.replaceChildren(
      h('p', null, `Połączono${email ? ` jako ${email}` : ''}.`),
      h('div', { class: 'row' },
        h('button', { class: 'btn small', onclick: async () => {
          msg.textContent = 'Pobieram dane…';
          const r = await api?.garminSync();
          msg.textContent = r?.ok ? `Pobrano dane z ${r.days} dni.` : `Nie udało się: ${r?.error ?? 'brak połączenia'}.`;
        } }, 'Pobierz dane teraz'),
        h('button', { class: 'btn ghost small', onclick: async () => {
          await api?.garminDisconnect();
          ctx.init.garmin = { connected: false, email: null };
          renderForm();
          msg.textContent = 'Rozłączono. Dane logowania usunięte.';
        } }, 'Rozłącz'),
      ),
      msg,
    );
  };
  const renderForm = () => {
    const email = h('input', { type: 'email', id: 'g-email', autocomplete: 'username', placeholder: 'adres e-mail konta Garmin' });
    const pass = h('input', { type: 'password', id: 'g-pass', autocomplete: 'current-password', placeholder: 'hasło' });
    const btn = h('button', { class: 'btn small', type: 'submit' }, 'Połącz');
    const form = h('form', { class: 'garmin-form', onsubmit: async (e: Event) => {
      e.preventDefault();
      btn.disabled = true;
      msg.textContent = 'Łączę z Garmin Connect…';
      const r = await api?.garminConnect(email.value.trim(), pass.value);
      btn.disabled = false;
      if (r?.ok) {
        ctx.init.garmin = { connected: true, email: email.value.trim() };
        renderConnected(email.value.trim());
        msg.textContent = 'Połączono i pobrano dane z ostatnich 14 dni.';
      } else {
        msg.textContent = `Nie udało się połączyć: ${r?.error ?? 'nieznany błąd'}. Sprawdź dane; konta z weryfikacją dwuetapową mogą nie działać.`;
      }
    } },
      h('label', { for: 'g-email' }, 'E-mail'), email,
      h('label', { for: 'g-pass' }, 'Hasło'), pass,
      btn,
    );
    body.replaceChildren(
      h('p', { class: 'fine' }, 'Sen, stres i Body Battery pomagają wyjaśnić słabsze dni. Hasło jest szyfrowane w systemowym pęku kluczy i używane tylko do logowania w Garmin Connect.'),
      form,
      msg,
    );
  };
  if (ctx.init.garmin.connected) renderConnected(ctx.init.garmin.email);
  else renderForm();
  return h('section', { class: 'block group' }, h('h2', null, 'Garmin Connect'), body);
}
