import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth, loginWithRedirect } from 'zitejs/auth';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { heartbeat, manageCommunity } from 'zitejs/api';
import { ChatProvider, useChat, usePoll } from './store';
import { usePrefs } from './prefs';
import Sidebar from './Sidebar';
import Thread from './Thread';
import EmptyThread from './EmptyThread';
import Discover from './Discover';
import Settings from './Settings';
import Saved from './Saved';
import Palette from './Palette';
import Confetti from './Confetti';
import CommunitySettings from './community/CommunitySettings';

const Spinner = () => <div className="grid h-[100dvh] flex-1 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

export default function ChatApp() {
  const { user, isLoading } = useAuth();
  useEffect(() => { if (!isLoading && !user) loginWithRedirect(); }, [isLoading, user]);
  if (isLoading || !user) return <Spinner />;
  const name = user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email.split('@')[0];
  return (
    <ChatProvider me={{ id: user.id, name, email: user.email, image: user.image }}>
      <Shell />
    </ChatProvider>
  );
}

function Join() {
  const { communityId = '' } = useParams();
  const { refresh } = useChat();
  const navigate = useNavigate();
  useEffect(() => {
    manageCommunity({ communityId, action: 'join' })
      .then(async (r) => {
        if (r.status === 'pending') { toast.success('Request sent — a moderator will review it'); return navigate('/app', { replace: true }); }
        await refresh(); toast.success('Welcome to the community!'); navigate(r.channelId ? `/app/c/${r.channelId}` : '/app', { replace: true }); })
      .catch((e) => { toast.error(e instanceof Error ? e.message : 'That invite link isn’t valid'); navigate('/app', { replace: true }); });
  }, [communityId, navigate, refresh]);
  return <Spinner />;
}

function Shell() {
  const prefs = usePrefs();
  useEffect(() => {
    const root = document.documentElement;
    if (prefs.accent) { root.style.setProperty('--primary', prefs.accent); root.style.setProperty('--ring', prefs.accent); }
    else { root.style.removeProperty('--primary'); root.style.removeProperty('--ring'); }
    root.style.fontSize = { sm: '14.5px', md: '16px', lg: '17.5px' }[prefs.fontSize];
    root.classList.toggle('compact', prefs.compact);
    root.classList.toggle('reduce-motion', prefs.reduceMotion);
    return () => { root.style.fontSize = ''; root.classList.remove('compact', 'reduce-motion'); root.style.removeProperty('--primary'); root.style.removeProperty('--ring'); };
  }, [prefs.accent, prefs.fontSize, prefs.compact, prefs.reduceMotion]);
  usePoll(() => heartbeat({}).catch(() => {}), 30000);
  const [, force] = useState(0);
  useEffect(() => { const t = setInterval(() => force((n) => n + 1), 60000); return () => clearInterval(t); }, []);
  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      <Routes>
        <Route index element={<><Sidebar /><EmptyThread /></>} />
        <Route path="c/:id" element={<><Sidebar hideOnMobile /><Thread /></>} />
        <Route path="discover" element={<><Sidebar hideOnMobile /><Discover /></>} />
        <Route path="saved" element={<><Sidebar hideOnMobile /><Saved /></>} />
        <Route path="settings" element={<><Sidebar hideOnMobile /><Settings /></>} />
        <Route path="community/:communityId" element={<><Sidebar hideOnMobile /><CommunitySettings /></>} />
        <Route path="join/:communityId" element={<Join />} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
      <Palette />
      <Confetti />
    </div>
  );
}
