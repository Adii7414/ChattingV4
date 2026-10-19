import { useSyncExternalStore } from 'react';

/** Personal, per-device preferences (look & feel, sounds, sidebar organisation). */
export type Folder = { id: string; name: string; ids: string[] };
export type Prefs = {
  accent: string | null; // bare HSL triple
  fontSize: 'sm' | 'md' | 'lg';
  compact: boolean;
  wallpaper: 'none' | 'dots' | 'grid' | 'waves' | 'glow';
  sound: 'chime' | 'pop' | 'bell' | 'off';
  dnd: boolean;
  quiet: { start: string; end: string } | null; // "22:00" – "07:00"
  reduceMotion: boolean;
  emojiShortcodes: boolean;
  folders: Folder[];
  chatColors: Record<string, string>;
  chatNicknames: Record<string, string>;
  sort: 'recent' | 'unread' | 'az';
  welcomed: string[];
};

const DEFAULTS: Prefs = {
  accent: null, fontSize: 'md', compact: false, wallpaper: 'none', sound: localStorage.getItem('sound') === 'off' ? 'off' : 'chime',
  dnd: false, quiet: null, reduceMotion: false, emojiShortcodes: true, folders: [], chatColors: {}, chatNicknames: {}, sort: 'recent', welcomed: [],
};
const KEY = 'chat:prefs';
let state: Prefs = (() => { try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return DEFAULTS; } })();
const subs = new Set<() => void>();

export const getPrefs = () => state;
export function setPrefs(p: Partial<Prefs> | ((s: Prefs) => Partial<Prefs>)) {
  state = { ...state, ...(typeof p === 'function' ? p(state) : p) };
  localStorage.setItem(KEY, JSON.stringify(state));
  subs.forEach((f) => f());
}
export function usePrefs() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, getPrefs);
}

export const ACCENT_CHOICES = [
  { name: 'Teal', v: '174 72% 32%' }, { name: 'Blue', v: '217 85% 52%' }, { name: 'Pink', v: '330 75% 52%' }, { name: 'Orange', v: '22 90% 52%' },
  { name: 'Green', v: '142 65% 36%' }, { name: 'Red', v: '0 75% 52%' }, { name: 'Amber', v: '40 95% 45%' }, { name: 'Slate', v: '215 20% 35%' },
];

/** True when sounds/notifications should be silenced right now (Do Not Disturb or quiet hours). */
export function isQuiet(now = new Date()) {
  const { dnd, quiet } = state;
  if (dnd) return true;
  if (!quiet) return false;
  const m = now.getHours() * 60 + now.getMinutes();
  const toM = (s: string) => { const [h, mm] = s.split(':').map(Number); return h * 60 + mm; };
  const a = toM(quiet.start), b = toM(quiet.end);
  return a <= b ? m >= a && m < b : m >= a || m < b;
}

export const WALLPAPERS: Record<Prefs['wallpaper'], React.CSSProperties> = {
  none: {},
  dots: { backgroundImage: 'radial-gradient(hsl(var(--foreground) / 0.08) 1px, transparent 1px)', backgroundSize: '18px 18px' },
  grid: { backgroundImage: 'linear-gradient(hsl(var(--foreground) / 0.05) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground) / 0.05) 1px, transparent 1px)', backgroundSize: '28px 28px' },
  waves: { backgroundImage: 'repeating-radial-gradient(circle at 0 0, transparent 0, hsl(var(--primary) / 0.04) 24px, transparent 48px)' },
  glow: { backgroundImage: 'radial-gradient(60% 50% at 80% 0%, hsl(var(--primary) / 0.12), transparent), radial-gradient(50% 40% at 0% 100%, hsl(var(--primary) / 0.08), transparent)' },
};
export const uidFolder = () => Math.random().toString(36).slice(2, 9);
