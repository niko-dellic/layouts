/** All values are CSS values. Theme state is separate from serialized layout structure. */
export interface LayoutTheme {
  bg?: string;
  panel?: string;
  header?: string;
  text?: string;
  muted?: string;
  line?: string;
  accent?: string;
  focus?: string;
  radius?: string;
  fontFamily?: string;
  fontSize?: string;
  headerHeight?: string;
}
export const themeProperties = {
  bg: '--layouts-bg',
  panel: '--layouts-panel',
  header: '--layouts-header',
  text: '--layouts-text',
  muted: '--layouts-muted',
  line: '--layouts-line',
  accent: '--layouts-accent',
  focus: '--layouts-focus',
  radius: '--layouts-radius',
  fontFamily: '--layouts-font-family',
  fontSize: '--layouts-font-size',
  headerHeight: '--layouts-header-height',
} as const;
export const themes = {
  dark: {
    bg: '#161a20',
    panel: '#1d222a',
    header: '#242a34',
    text: '#e5e9f0',
    muted: '#a2acba',
    line: '#39414e',
    accent: '#8bbaaa',
    focus: '#b3decf',
  },
  light: {
    bg: '#dce1e8',
    panel: '#ffffff',
    header: '#f0f3f7',
    text: '#202936',
    muted: '#586579',
    line: '#c9d1dc',
    accent: '#357a69',
    focus: '#195fc1',
  },
  sage: {
    bg: '#cbd3c7',
    panel: '#f1f3ed',
    header: '#e9ede4',
    text: '#2d4133',
    muted: '#72816e',
    line: '#d0d8c9',
    accent: '#6a957a',
    focus: '#316c4b',
  },
} as const satisfies Record<string, LayoutTheme>;
export function applyTheme(root: HTMLElement, theme: LayoutTheme) {
  for (const key of Object.keys(themeProperties) as (keyof LayoutTheme)[]) {
    const value = theme[key];
    if (value === undefined) root.style.removeProperty(themeProperties[key]);
    else root.style.setProperty(themeProperties[key], value);
  }
}
