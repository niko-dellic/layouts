import { themes, themeFamilies } from 'layouts';
import type { AutoCollapse } from 'layouts-core';
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
    iconSize = 16,
    radius = 5,
    handleWidth = 6,
    showDisabledHandles = false,
    showFrozenBorders = true;
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
      iconSize: `${iconSize}px`,
      headerHeight: `${headerHeight}px`,
      radius: `${radius}px`,
      resizeHandleWidth: `${handleWidth}px`,
      disabledResizeHandleWidth: showDisabledHandles ? `${handleWidth}px` : '0px',
      frozenPaneBorder: showFrozenBorders ? 'var(--layouts-line)' : 'transparent',
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
  const collapseSelect = document.createElement('select');
  collapseSelect.setAttribute('aria-label', 'Auto collapse');
  for (const mode of ['disabled', 'protected', 'enabled'] as const) {
    const option = document.createElement('option');
    option.value = mode;
    option.textContent = mode[0]!.toUpperCase() + mode.slice(1);
    collapseSelect.append(option);
  }
  collapseSelect.value = store.getAutoCollapse();
  collapseSelect.onchange = () => store.setAutoCollapse(collapseSelect.value as AutoCollapse);
  const collapseField = labelControl(collapseSelect, 'Auto collapse');
  const barSelect = document.createElement('select');
  barSelect.setAttribute('aria-label', 'Tab bar style');
  for (const [value, label] of [
    ['full', 'Full-width'],
    ['angle', 'Tapered: angle'],
    ['round', 'Tapered: round'],
    ['scoop', 'Tapered: scoop'],
    ['vertical', 'Fitted'],
  ]) {
    const option = document.createElement('option');
    option.value = value!;
    option.textContent = label!;
    barSelect.append(option);
  }
  barSelect.value = 'angle';
  const barField = labelControl(barSelect, 'Tab bar');
  const placement = document.createElement('select');
  placement.setAttribute('aria-label', 'Tab placement');
  for (const [value, label] of [
    ['top', 'Top'],
    ['left', 'Left: icons only'],
  ]) {
    const option = document.createElement('option');
    option.value = value!;
    option.textContent = label!;
    placement.append(option);
  }
  const placementField = labelControl(placement, 'Tab placement');
  const amount = document.createElement('input');
  amount.type = 'range';
  amount.step = '1';
  const amountField = labelControl(amount, 'Angle');
  amountField.classList.add('demo-range');
  const values = { angle: '60', round: '32', scoop: '32' };
  const applyBar = () => {
    const shape = barSelect.value as 'angle' | 'round' | 'scoop' | 'vertical' | 'full';
    const position = placement.value as 'top' | 'left';
    if (shape === 'full' || shape === 'vertical') {
      getMounted()?.setTabBar(
        shape === 'full'
          ? { placement: position, mode: 'full' }
          : { placement: position, mode: 'tapered', shape },
      );
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
    const taperWidth =
      shape === 'angle'
        ? (position === 'left' ? 40 : headerHeight) / Math.tan((value * Math.PI) / 180)
        : value;
    getMounted()?.setTabBar({ placement: position, mode: 'tapered', shape, taperWidth });
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
  placement.onchange = updateAmount;
  themeField.after(placementField, barField, amountField);
  updateAmount();
  const resizing = document.createElement('section');
  resizing.className = 'demo-resizing';
  resizing.setAttribute('aria-label', 'Resizing');
  const resizingTitle = document.createElement('h3');
  resizingTitle.textContent = 'Resizing';
  resizing.append(resizingTitle);
  let last: HTMLElement = amountField;
  for (const [name, initial, min, max, update] of [
    [
      'Resize handle width',
      handleWidth,
      2,
      16,
      (v: number) => {
        handleWidth = v;
      },
    ],
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
      'Icon size',
      iconSize,
      12,
      24,
      (v: number) => {
        iconSize = v;
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
    if (name === 'Resize handle width') resizing.append(field);
    else {
      last.after(field);
      last = field;
    }
  }
  const disabledLabel = document.createElement('label');
  disabledLabel.className = 'demo-handle-toggle';
  const disabledInput = document.createElement('input');
  disabledInput.type = 'checkbox';
  disabledInput.checked = showDisabledHandles;
  disabledLabel.append(disabledInput, 'Show disabled resize handles');
  disabledInput.onchange = () => {
    showDisabledHandles = disabledInput.checked;
    applyTheme();
  };
  const borderLabel = document.createElement('label');
  borderLabel.className = 'demo-handle-toggle';
  const borderInput = document.createElement('input');
  borderInput.type = 'checkbox';
  borderInput.checked = showFrozenBorders;
  borderLabel.append(borderInput, 'Show frozen pane borders');
  borderInput.onchange = () => {
    showFrozenBorders = borderInput.checked;
    applyTheme();
  };
  resizing.append(collapseField, disabledLabel, borderLabel);
  last.after(resizing);
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
}
