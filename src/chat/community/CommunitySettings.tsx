import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BarChart3, CalendarDays, Hash, History, Palette, Shield, ShieldCheck, Users } from 'lucide-react';
import { getCommunity } from 'zitejs/api';
import { Skeleton } from '@project/components/ui/skeleton';
import { cn } from '@project/components/lib/utils';
import { parseCommunity } from '../../lib/community';
import { useChat } from '../store';
import type { Data } from './kit';
import ProfileTab from './ProfileTab';
import RolesTab from './RolesTab';
import MembersTab from './MembersTab';
import ChannelsTab from './ChannelsTab';
import ModerationTab, { AuditTab } from './ModerationTab';
import EventsTab from './EventsTab';
import InsightsTab from './InsightsTab';

const TABS = [
  { k: 'events', l: 'Events', i: CalendarDays, need: null },
  { k: 'profile', l: 'Look & profile', i: Palette, need: 'manageCommunity' },
  { k: 'channels', l: 'Channels', i: Hash, need: 'manageChannels' },
  { k: 'roles', l: 'Roles', i: ShieldCheck, need: 'manageRoles' },
  { k: 'members', l: 'Members', i: Users, need: null },
  { k: 'moderation', l: 'Moderation', i: Shield, need: null },
  { k: 'insights', l: 'Insights', i: BarChart3, need: null },
  { k: 'audit', l: 'Audit log', i: History, need: 'manageCommunity' },
] as const;

export default function CommunitySettings() {
  const { communityId = '' } = useParams();
  const { refresh } = useChat();
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState(false);
  const [tab, setTab] = useState<(typeof TABS)[number]['k'] | null>(null);
  const load = useCallback(async () => {
    try { const r = await getCommunity({ communityId }); setD({ ...r, id: communityId, s: parseCommunity(r.settings) }); setErr(false); } catch { setErr(true); }
    refresh();
  }, [communityId, refresh]);
  useEffect(() => { setD(null); load(); }, [load]);

  if (err) return <section className="grid flex-1 place-items-center text-muted-foreground">You don’t have access to this community. <Link to="/app" className="underline">Go back</Link></section>;
  const tabs = d ? TABS.filter((t) => !t.need || d.myPerms.includes(t.need)) : [];
  const active = tab && tabs.some((t) => t.k === tab) ? tab : tabs[0]?.k;
  const props = d ? { d, reload: load } : null;

  return (
    <section className="flex min-w-0 flex-1 flex-col overflow-y-auto">
      <div className="h-32 shrink-0" style={{ background: d?.s.banner ? `url(${d.s.banner}) center/cover` : `linear-gradient(135deg, ${d?.s.accent ?? '#0f766e'}, ${d?.s.accent ?? '#0f766e'}66)` }} />
      <div className="mx-auto w-full max-w-4xl px-4 pb-16 sm:px-8">
        <div className="-mt-10 flex items-end gap-4">
          <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-3xl border-4 border-background bg-secondary text-3xl">{d?.s.icon ? <img src={d.s.icon} alt="" className="h-full w-full object-cover" /> : d?.emoji || d?.name[0]}</div>
          <div className="min-w-0 pb-1">
            <Link to="/app" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ArrowLeft className="h-3 w-3" /> Back to chats</Link>
            {d ? <h1 className="truncate text-2xl font-semibold tracking-tight">{d.name}</h1> : <Skeleton className="mt-1 h-7 w-48" />}
          </div>
        </div>
        <div className="mt-6 flex gap-1.5 overflow-x-auto pb-1">
          {tabs.map((t) => (
            <button key={t.k} onClick={() => setTab(t.k)} className={cn('flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition', active === t.k ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground hover:text-foreground')}>
              <t.i className="h-4 w-4" />{t.l}{t.k === 'moderation' && d && d.pending.length > 0 && <span className="rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground">{d.pending.length}</span>}
            </button>
          ))}
        </div>
        <div className="mt-5">
          {!props ? <Skeleton className="h-96 rounded-3xl" /> : (
            <div key={`${active}-${d?.s.audit[0]?.at ?? ''}`}>
              {active === 'profile' && <ProfileTab {...props} />}
              {active === 'channels' && <ChannelsTab {...props} />}
              {active === 'roles' && <RolesTab {...props} />}
              {active === 'members' && <MembersTab {...props} />}
              {active === 'moderation' && <ModerationTab {...props} />}
              {active === 'audit' && <AuditTab {...props} />}
              {active === 'events' && <EventsTab {...props} />}
              {active === 'insights' && <InsightsTab {...props} />}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
