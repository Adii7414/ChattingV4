import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Camera, Loader2, LogOut, Moon, Sun } from 'lucide-react';
import { logout } from 'zitejs/auth';
import { useUpload } from 'zitejs/upload';
import { blockUser, myProfile } from 'zitejs/api';
import { format } from 'date-fns';
import { Switch } from '@project/components/ui/switch';
import { Skeleton } from '@project/components/ui/skeleton';
import PersonAvatar from './Avatars';
import PersonalPrefs, { ProfileBannerPicker } from './PersonalPrefs';
import { bannerStyle } from './banners';
import { ping, useChat, type Profile } from './store';

const field = 'focus-ring h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none';
const STATUSES = [['💬', 'Available'], ['🎧', 'Focusing'], ['🌴', 'On holiday'], ['🤒', 'Out sick'], ['🚗', 'Commuting']];

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
      <h2 className="font-semibold">{title}</h2>
      {desc && <p className="mt-0.5 text-sm text-muted-foreground">{desc}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4">
      <span><span className="block text-sm font-medium">{label}</span><span className="text-xs text-muted-foreground">{desc}</span></span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

const CLEAR = [{ k: 'never', l: 'Never' }, { k: '30', l: '30 min' }, { k: '60', l: '1 hour' }, { k: '240', l: '4 hours' }, { k: 'today', l: 'Today' }, { k: 'week', l: 'This week' }];
function expiryFor(k: string): string | null {
  if (k === 'never') return null;
  const d = new Date();
  if (k === 'today') { d.setHours(23, 59, 0, 0); return d.toISOString(); }
  if (k === 'week') { d.setDate(d.getDate() + ((7 - d.getDay()) % 7)); d.setHours(23, 59, 0, 0); return d.toISOString(); }
  return new Date(Date.now() + Number(k) * 60_000).toISOString();
}

function BlockedPeople() {
  const { people } = useChat();
  const [blocked, setBlocked] = useState<string[] | null>(null);
  useEffect(() => { blockUser({}).then((r) => setBlocked(r.blocked)).catch(() => setBlocked([])); }, []);
  if (!blocked?.length) return null;
  const unblock = async (id: string) => {
    setBlocked((b) => b && b.filter((x) => x !== id));
    try { await blockUser({ userId: id }); toast.success('Unblocked'); } catch { toast.error('Couldn’t unblock'); }
  };
  return (
    <section className="space-y-3 rounded-3xl border border-border p-5">
      <div><h2 className="font-semibold">Blocked people</h2><p className="text-sm text-muted-foreground">They can’t message you directly, and you won’t see their messages.</p></div>
      {blocked.map((id) => (
        <div key={id} className="flex items-center justify-between rounded-xl bg-secondary px-3 py-2 text-sm">
          <span>{people.get(id)?.name ?? 'Someone'}</span>
          <button onClick={() => unblock(id)} className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium">Unblock</button>
        </div>
      ))}
    </section>
  );
}

export default function Settings() {
  const { me, profile, setProfile } = useChat();
  const [d, setD] = useState<Profile | null>(profile);
  const [clear, setClear] = useState('');
  const [saving, setSaving] = useState(false);
  const { upload, isUploading } = useUpload();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => { if (profile && !d) setD(profile); }, [profile, d]);

  const save = async (update: Partial<Profile>, quiet = false) => {
    setSaving(!quiet);
    try { const p = await myProfile({ update }); setProfile(p); setD((cur) => (quiet && cur ? { ...cur, ...update } : p)); if (!quiet) toast.success('Profile saved'); }
    catch { toast.error('Couldn’t save your changes'); }
    finally { setSaving(false); }
  };
  const toggle = (k: 'showOnlineStatus' | 'sendReadReceipts' | 'enterToSend') => (v: boolean) => { setD((x) => x && { ...x, [k]: v }); save({ [k]: v }, true); };
  const setTheme = (isDark: boolean) => { setDark(isDark); document.documentElement.classList.toggle('dark', isDark); localStorage.setItem('theme', isDark ? 'dark' : 'light'); };
  const pickPhoto = async (f?: File) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) return toast.error('Choose an image file');
    try { const { url } = await upload(f); await save({ image: url }); } catch { toast.error('Upload failed'); }
  };

  if (!d) return <section className="flex-1 space-y-4 p-8"><Skeleton className="h-40 rounded-3xl" /><Skeleton className="h-64 rounded-3xl" /></section>;
  const dirty = profile && (clear !== '' || (['firstName', 'lastName', 'bio', 'pronouns', 'statusText', 'statusEmoji'] as const).some((k) => d[k] !== profile[k]));
  const nameOk = d.firstName.trim().length > 0;

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl space-y-5 px-5 py-8 sm:px-8 sm:py-12">
        <Link to="/app" className="inline-flex items-center gap-1 text-sm text-muted-foreground md:hidden"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <h1 className="text-3xl font-semibold tracking-tight">Profile & settings</h1>

        <Section title="Profile" desc="This is how people see you in Chatting.">
          <div className="flex items-center gap-4">
            <label className="group relative cursor-pointer">
              <PersonAvatar name={d.name} image={d.image} size={76} />
              <span className="absolute inset-0 grid place-items-center rounded-full bg-black/40 text-white opacity-0 transition group-hover:opacity-100">{isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Camera className="h-5 w-5" />}</span>
              <input type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
            </label>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold">{d.name}</p>
              <p className="truncate text-sm text-muted-foreground">{me.email}</p>
              {d.image && <button onClick={() => save({ image: null })} className="mt-1 text-xs text-muted-foreground underline">Remove photo</button>}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><input value={d.firstName} onChange={(e) => setD({ ...d, firstName: e.target.value })} maxLength={40} placeholder="First name" className={field} />{!nameOk && <p className="mt-1 text-xs text-destructive">First name is required</p>}</div>
            <input value={d.lastName} onChange={(e) => setD({ ...d, lastName: e.target.value })} maxLength={40} placeholder="Last name" className={field} />
          </div>
          <input value={d.pronouns} onChange={(e) => setD({ ...d, pronouns: e.target.value })} maxLength={30} placeholder="Pronouns (optional)" className={field} />
          <div>
            <textarea value={d.bio} onChange={(e) => setD({ ...d, bio: e.target.value })} maxLength={300} rows={3} placeholder="A short bio" className={`${field} h-auto py-2.5`} />
            <p className="mt-1 text-right text-xs text-muted-foreground">{d.bio.length}/300</p>
          </div>
        </Section>

        <Section title="Status" desc="Let people know what you’re up to.">
          <div className="flex gap-2">
            <input value={d.statusEmoji} onChange={(e) => setD({ ...d, statusEmoji: e.target.value })} maxLength={4} placeholder="🙂" aria-label="Status emoji" className={`${field} w-14 text-center text-lg`} />
            <input value={d.statusText} onChange={(e) => setD({ ...d, statusText: e.target.value })} maxLength={80} placeholder="What’s your status?" className={field} />
          </div>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map(([e, t]) => <button key={t} onClick={() => setD({ ...d, statusEmoji: e, statusText: t })} className="rounded-full border border-border px-3 py-1.5 text-sm hover:bg-secondary">{e} {t}</button>)}
            {(d.statusText || d.statusEmoji) && <button onClick={() => setD({ ...d, statusEmoji: '', statusText: '' })} className="rounded-full px-3 py-1.5 text-sm text-muted-foreground underline">Clear</button>}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Clear after</span>
            {CLEAR.map((c) => <button key={c.k} onClick={() => setClear(c.k)} className={`rounded-full border px-3 py-1 ${clear === c.k ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-secondary'}`}>{c.l}</button>)}
          </div>
          {profile?.statusExpiresAt && !clear && <p className="text-xs text-muted-foreground">Your status clears automatically {format(new Date(profile.statusExpiresAt), 'EEE d MMM, h:mm a')}.</p>}
        </Section>

        <section className="space-y-3 overflow-hidden rounded-3xl border border-border">
          <div className="h-20" style={bannerStyle(d.banner)} />
          <div className="space-y-3 px-5 pb-5">
            <div><h2 className="font-semibold">Profile banner</h2><p className="text-sm text-muted-foreground">Shown at the top of your profile card.</p></div>
            <ProfileBannerPicker value={d.banner} onChange={(banner) => save({ banner }, true)} />
          </div>
        </section>

        <PersonalPrefs />

        <BlockedPeople />

        {dirty && (
          <div className="sticky bottom-4 z-10 flex items-center justify-between rounded-2xl border border-border bg-background/90 p-3 pl-5 shadow-lg backdrop-blur">
            <span className="text-sm">You have unsaved changes</span>
            <div className="flex gap-2">
              <button onClick={() => { setD(profile); setClear(''); }} className="h-10 rounded-full px-4 text-sm">Discard</button>
              <button disabled={!nameOk || saving} onClick={() => save({ firstName: d.firstName, lastName: d.lastName, bio: d.bio, pronouns: d.pronouns, statusText: d.statusText, statusEmoji: d.statusEmoji, ...(clear ? { statusExpiresAt: expiryFor(clear) } : {}) }).then(() => setClear(''))}
                className="flex h-10 items-center gap-2 rounded-full bg-foreground px-5 text-sm font-medium text-background disabled:opacity-40">{saving && <Loader2 className="h-4 w-4 animate-spin" />}Save</button>
            </div>
          </div>
        )}

        <Section title="Privacy" desc="Changes apply right away.">
          <Toggle label="Show when I’m online" desc="If off, nobody sees your green dot or last seen time — and you still see theirs." checked={d.showOnlineStatus} onChange={toggle('showOnlineStatus')} />
          <Toggle label="Send read receipts" desc="If off, people won’t see “Read” on messages they send you." checked={d.sendReadReceipts} onChange={toggle('sendReadReceipts')} />
        </Section>

        <Notifications />

        <Section title="Chats & appearance">
          <Toggle label="Press Enter to send" desc="If off, Enter adds a new line and ⌘/Ctrl + Enter sends." checked={d.enterToSend} onChange={toggle('enterToSend')} />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Theme</span>
            <div className="flex rounded-xl bg-secondary p-1 text-sm">
              {([[false, 'Light', Sun], [true, 'Dark', Moon]] as const).map(([v, l, I]) => (
                <button key={l} onClick={() => setTheme(v)} className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 ${dark === v ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}><I className="h-3.5 w-3.5" />{l}</button>
              ))}
            </div>
          </div>
        </Section>

        <Section title="Account">
          <p className="text-sm text-muted-foreground">Signed in as <span className="text-foreground">{me.email}</span>. Read our <Link to="/privacy" className="underline">Privacy Policy</Link> and <Link to="/terms" className="underline">Terms</Link>.</p>
          <button onClick={() => logout()} className="flex h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:bg-secondary"><LogOut className="h-4 w-4" /> Sign out</button>
        </Section>
      </div>
    </section>
  );
}

function Notifications() {
  const [perm, setPerm] = useState(() => ('Notification' in window ? Notification.permission : 'denied'));
  const [sound, setSound] = useState(() => localStorage.getItem('sound') !== 'off');
  return (
    <Section title="Notifications" desc="Muted chats never notify you.">
      <Toggle label="Desktop notifications" desc={perm === 'denied' ? 'Blocked by your browser — allow notifications for this site in your browser settings.' : 'Get a pop-up for new messages while Chatting is in the background.'}
        checked={perm === 'granted'} onChange={async (v) => { if (v && 'Notification' in window) setPerm(await Notification.requestPermission()); else if (!v) toast('Turn notifications off in your browser’s site settings'); }} />
      <Toggle label="Message sound" desc="A soft chime when a new message arrives." checked={sound} onChange={(v) => { setSound(v); localStorage.setItem('sound', v ? 'on' : 'off'); if (v) ping(); }} />
    </Section>
  );
}
