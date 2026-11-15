import type { ReactNode } from 'react';
import { SiteHeader } from './site-header';

export function PageShell({ eyebrow, title, intro, heroExtra, children }: { eyebrow: string; title: ReactNode; intro?: string; heroExtra?: ReactNode; children: ReactNode }) {
  return <main className="subpage"><SiteHeader /><section className="page-hero"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{intro && <p className="page-intro">{intro}</p>}{heroExtra}</section>{children}<footer><div className="brand"><span className="brand-mark">M</span> MODMYRIDE</div><span>Built for the road ahead.</span><span>© 2026</span></footer></main>;
}
