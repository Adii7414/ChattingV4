import { MessageCircle } from 'lucide-react';

export default function EmptyThread() {
  return (
    <section className="hidden flex-1 flex-col items-center justify-center gap-4 text-center md:flex">
      <span className="grid h-16 w-16 place-items-center rounded-3xl bg-secondary"><MessageCircle className="h-7 w-7 text-muted-foreground" /></span>
      <div>
        <p className="text-xl font-semibold tracking-tight">Pick a conversation</p>
        <p className="mt-1 text-muted-foreground">Or start a new one from the sidebar.</p>
      </div>
    </section>
  );
}
