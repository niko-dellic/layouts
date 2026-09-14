import { themeFamilies } from 'layouts';

const preferredMode = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
export const defaultThemeName = `neutral-${preferredMode}`;
export const defaultTheme = {
  ...themeFamilies.neutral[preferredMode],
  fontSize: '11px',
  headerHeight: '32px',
};
