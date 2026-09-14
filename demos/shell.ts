import { themes, themeFamilies } from 'layouts';
import { store } from './model.js';
import { defaultThemeName } from './theme.js';
import type { MountedLayout } from 'layouts';
// Controls belong to the demo session and survive pane moves and layout resets.
let settings: HTMLElement | undefined;
let settingsHost: HTMLElement | undefined;
let applySettings: (() => void) | undefined;
export function mountTheming(element: HTMLElement) {
  settingsHost = element;
  element.classList.add('demo-theming');
  if (settings) element.append(settings);
  const win = element.ownerDocument.defaultView!;
  const frame = win.requestAnimationFrame(() => applySettings?.());
  return {
    dispose() {
      win.cancelAnimationFrame(frame);
      if (settingsHost === element) {
        settings?.remove();
        settingsHost = undefined;
      }
    },
  };
}
export function setupShell(getMounted: () => MountedLayout | undefined) {
  let headerHeight = 32,
    fontSize = 11,
    radius = 5,
    underline = true;
  settings = document.querySelector<HTMLElement>('[aria-label="Workspace controls"]')!;
  settings.remove();
  settingsHost?.append(settings);
  const themeSelect = document.createElement('select');
  themeSelect.setAttribute('aria-label', 'Workspace theme');
  for (const name of [
    'sage',
    'light',
    'dark',
    ...Object.keys(themeFamilies).flatMap((family) => [`${family}-dark`, `${family}-light`]),
  ]) {
    const option = document.createElement('option');
    option.value = name;
    option.textContent = name[0]!.toUpperCase() + name.slice(1);
    themeSelect.append(option);
  }
  themeSelect.value = defaultThemeName;
  const applyTheme = () => {
    const theme = themeSelect.value.includes('-')
      ? themeFamilies[themeSelect.value.split('-')[0] as keyof typeof themeFamilies][
          themeSelect.value.split('-')[1] as 'dark' | 'light'
        ]
      : themes[themeSelect.value as keyof typeof themes];
    for (const [key, value] of Object.entries(theme)) {
      document.documentElement.style.setProperty(`--layouts-${key}`, value);
    }
    document.documentElement.style.colorScheme = themeSelect.value.includes('dark')
      ? 'dark'
      : 'light';
    getMounted()?.setTheme({
      ...theme,
      fontSize: `${fontSize}px`,
      headerHeight: `${headerHeight}px`,
      radius: `${radius}px`,
      tabUnderline: underline ? theme.accent : 'transparent',
    });
  };
  themeSelect.onchange = applyTheme;
  applyTheme();
  const labelControl = (control: HTMLElement, text: string) => {
    const label = document.createElement('label');
    label.className = 'demo-field';
    const caption = document.createElement('span');
    caption.textContent = text;
    label.append(caption, control);
    return label;
  };
  const themeField = labelControl(themeSelect, 'Theme');
  settings.prepend(themeField);
  const barSelect = document.createElement('select');
  barSelect.setAttribute('aria-label', 'Tab bar style');
  for (const [value, label] of [
    ['full', 'Full-width'],
    ['angle', 'Tapered: angle'],
    ['round', 'Tapered: round'],
    ['scoop', 'Tapered: scoop'],
    ['vertical', 'Fitted: vertical'],
  ]) {
    const option = document.createElement('option');
    option.value = value!;
    option.textContent = label!;
    barSelect.append(option);
  }
  barSelect.value = 'angle';
  const barField = labelControl(barSelect, 'Tab bar');
  const amount = document.createElement('input');
  amount.type = 'range';
  amount.step = '1';
  const amountField = labelControl(amount, 'Angle');
  amountField.classList.add('demo-range');
  const values = { angle: '60', round: '32', scoop: '32' };
  const applyBar = () => {
    const shape = barSelect.value as 'angle' | 'round' | 'scoop' | 'vertical' | 'full';
    if (shape === 'full' || shape === 'vertical') {
      getMounted()?.setTabBar(shape === 'full' ? { mode: 'full' } : { mode: 'tapered', shape });
      return;
    }
    const value = Number(amount.value);
    const name = shape === 'angle' ? 'Angle' : shape === 'round' ? 'Round width' : 'Scoop width';
    const unit = shape === 'angle' ? '°' : 'px';
    amount.setAttribute('aria-label', name);
    amount.setAttribute('aria-valuetext', `${value} ${shape === 'angle' ? 'degrees' : 'pixels'}`);
    amountField.querySelector('span')!.textContent = `${name}: ${value}${unit}`;
    values[shape] = amount.value;
    // Angle is measured from the horizontal.
    const taperWidth = shape === 'angle' ? headerHeight / Math.tan((value * Math.PI) / 180) : value;
    getMounted()?.setTabBar({ mode: 'tapered', shape, taperWidth });
  };
  const updateAmount = () => {
    const shape = barSelect.value as keyof typeof values;
    amountField.hidden = !(shape in values);
    amount.disabled = amountField.hidden;
    if (!amountField.hidden) {
      amount.min = '1';
      amount.max = shape === 'angle' ? '89' : '128';
      amount.value = values[shape];
    }
    applyBar();
  };
  amount.oninput = applyBar;
  barSelect.onchange = updateAmount;
  themeField.after(barField, amountField);
  updateAmount();
  const underlineInput = document.createElement('input');
  underlineInput.type = 'checkbox';
  underlineInput.checked = underline;
  const underlineLabel = document.createElement('label');
  underlineLabel.className = 'demo-toggle';
  underlineLabel.append(underlineInput, 'Active tab underline');
  underlineInput.onchange = () => {
    underline = underlineInput.checked;
    applyTheme();
  };
  amountField.after(underlineLabel);
  let last: HTMLElement = underlineLabel;
  for (const [name, initial, min, max, update] of [
    [
      'Header height',
      headerHeight,
      28,
      48,
      (v: number) => {
        headerHeight = v;
      },
    ],
    [
      'Text size',
      fontSize,
      10,
      16,
      (v: number) => {
        fontSize = v;
      },
    ],
    [
      'Corner radius',
      radius,
      0,
      12,
      (v: number) => {
        radius = v;
      },
    ],
  ] as const) {
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(min);
    input.max = String(max);
    input.value = String(initial);
    input.setAttribute('aria-label', name);
    const field = labelControl(input, `${name}: ${initial}px`);
    field.classList.add('demo-range');
    input.oninput = () => {
      update(Number(input.value));
      field.querySelector('span')!.textContent = `${name}: ${input.value}px`;
      applyTheme();
      applyBar();
    };
    last.after(field);
    last = field;
  }
  const source = document.querySelector<HTMLElement>('.source-link');
  if (source) settings.append(source);
  applySettings = () => {
    applyTheme();
    applyBar();
  };
  const output = document.querySelector<HTMLTextAreaElement>('#layout-json')!;
  const dialog = document.querySelector<HTMLDialogElement>('#json-dialog')!;
  const error = document.querySelector<HTMLElement>('#json-error')!;
  settings.querySelector('#json-open')!.addEventListener('click', () => {
    output.value = JSON.stringify(store.export(), null, 2);
    error.textContent = '';
    dialog.showModal();
  });
  document.querySelector('#json-cancel')!.addEventListener('click', () => dialog.close());
  document.querySelector('#json-load')!.addEventListener('click', () => {
    try {
      store.load(JSON.parse(output.value));
      dialog.close();
    } catch (e) {
      error.textContent = e instanceof Error ? e.message : String(e);
    }
  });
  settings.querySelector('#reset')!.addEventListener('click', () => store.reset());
  settings
    .querySelector('#popout-inspector')!
    .addEventListener('click', () => getMounted()?.popout('notes'));
  const status = document.querySelector('#layout-status')!;
  store.subscribe(({ action, layout }) => {
    status.textContent = `${action} · ${Object.keys(layout.panes).length} panes`;
  });
}
