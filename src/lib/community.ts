// Shared (frontend + backend) shape of community and channel customisation, stored as JSON.

export const PERMS = {
  manageCommunity: 'Edit community look & settings',
  manageChannels: 'Create, edit, reorder & delete channels',
  manageRoles: 'Create roles and assign them',
  manageMessages: 'Delete & pin anyone’s messages',
  kick: 'Remove members',
  ban: 'Ban members & approve join requests',
  postAnnouncements: 'Post in announcement channels',
  bypassSlowmode: 'Skip slow mode & auto-moderation',
  mentionEveryone: 'Use @everyone',
} as const;
export type Perm = keyof typeof PERMS;
export const ALL_PERMS = Object.keys(PERMS) as Perm[];

export type Role = { id: string; name: string; color: string; perms: Perm[]; hoist: boolean };
export type Category = { id: string; name: string };
export type AuditEntry = { at: string; by: string; text: string };

export type CommunitySettings = {
  icon: string | null;
  banner: string | null;
  accent: string; // hex
  tagline: string;
  tags: string[];
  vanity: string | null;
  categories: Category[];
  channelOrder: string[];
  roles: Role[];
  memberRoles: Record<string, string[]>;
  nicknames: Record<string, string>;
  joinMode: 'open' | 'approval' | 'invite';
  pending: string[];
  banned: string[];
  bannedWords: string[];
  blockLinks: boolean;
  maxLength: number;
  welcome: string;
  systemChannel: string | null;
  rules: string[];
  quickReactions: string[];
  audit: AuditEntry[];
  timeouts: Record<string, string>; // userId -> ISO time the timeout ends
  warnings: Record<string, { at: string; by: string; reason: string }[]>;
  modNotes: Record<string, string>;
};

export type ChannelSettings = {
  topic: string;
  category: string | null;
  slowmode: number; // seconds
  announcement: boolean;
  allowedRoles: string[]; // empty = everyone
};

export const ACCENTS = ['#0f766e', '#2563eb', '#db2777', '#ea580c', '#16a34a', '#7c3aed', '#dc2626', '#ca8a04', '#0891b2', '#475569'];
export const DEFAULT_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🔥', '🎉', '🙏'];

const obj = (raw: unknown) => {
  if (!raw) return {};
  try { const v = typeof raw === 'string' ? JSON.parse(raw) : raw; return v && typeof v === 'object' ? (v as Record<string, unknown>) : {}; } catch { return {}; }
};

export function parseCommunity(raw: unknown): CommunitySettings {
  const s = obj(raw) as Partial<CommunitySettings>;
  return {
    icon: s.icon ?? null, banner: s.banner ?? null, accent: s.accent || ACCENTS[0], tagline: s.tagline ?? '', tags: s.tags ?? [],
    vanity: s.vanity ?? null, categories: s.categories ?? [], channelOrder: s.channelOrder ?? [], roles: s.roles ?? [],
    memberRoles: s.memberRoles ?? {}, nicknames: s.nicknames ?? {}, joinMode: s.joinMode ?? 'open', pending: s.pending ?? [],
    banned: s.banned ?? [], bannedWords: s.bannedWords ?? [], blockLinks: s.blockLinks ?? false, maxLength: s.maxLength ?? 5000,
    welcome: s.welcome ?? '', systemChannel: s.systemChannel ?? null, rules: s.rules ?? [],
    quickReactions: s.quickReactions?.length ? s.quickReactions : DEFAULT_REACTIONS, audit: s.audit ?? [], timeouts: s.timeouts ?? {}, warnings: s.warnings ?? {}, modNotes: s.modNotes ?? {},
  };
}

export function parseChannel(raw: unknown): ChannelSettings {
  const s = obj(raw) as Partial<ChannelSettings>;
  return { topic: s.topic ?? '', category: s.category ?? null, slowmode: s.slowmode ?? 0, announcement: s.announcement ?? false, allowedRoles: s.allowedRoles ?? [] };
}

/** Everything a member may do. The owner can do everything. */
export function permsOf(s: CommunitySettings, ownerId: string | null, userId: string): Set<Perm> {
  if (ownerId === userId) return new Set(ALL_PERMS);
  const mine = new Set(s.memberRoles[userId] ?? []);
  return new Set(s.roles.filter((r) => mine.has(r.id)).flatMap((r) => r.perms));
}

/** The highest-listed role a member holds (used for name colour). */
export function topRole(s: CommunitySettings, userId: string) {
  const mine = new Set(s.memberRoles[userId] ?? []);
  return s.roles.find((r) => mine.has(r.id)) ?? null;
}

export function canSeeChannel(ch: ChannelSettings, s: CommunitySettings, ownerId: string | null, userId: string) {
  if (!ch.allowedRoles.length || ownerId === userId) return true;
  const p = permsOf(s, ownerId, userId);
  if (p.has('manageChannels')) return true;
  return (s.memberRoles[userId] ?? []).some((r) => ch.allowedRoles.includes(r));
}

export const uid = () => Math.random().toString(36).slice(2, 10);

/** ISO end time if the member is currently timed out, else null. */
export const timedOutUntil = (s: CommunitySettings, userId: string) => { const t = s.timeouts[userId]; return t && new Date(t) > new Date() ? t : null; };
