'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getCartItemCount } from '../lib/cart';
import { buildCollectionSearchHref } from '../lib/search-url';
import { useCart } from './cart-provider';
import { CartDrawer } from './cart-drawer';
import { getSupabaseBrowser } from '../lib/supabase';
import type { Session } from '@supabase/supabase-js';

const links = [
  { id: 'shop', label: 'Collection', href: '/collection' },
  { id: 'fitment', label: 'Fitment', href: '/fitment' },
];

export function SiteHeader() {
  const [active, setActive] = useState('shop');
  const [menuOpen, setMenuOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cartOpen, setCartOpen] = useState(false);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();
  const { lines, ready } = useCart();

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    let active = true;
    const syncIdentity = async (session: Session | null) => {
      setIsSignedIn(Boolean(session));
      if (!session) { setIsAdmin(false); return; }
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .maybeSingle();
        if (active) setIsAdmin(profile?.role === 'admin');
      } catch {
        if (active) setIsAdmin(false);
      }
    };
    void supabase.auth.getSession().then(({ data }) => syncIdentity(data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncIdentity(session);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    const update = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0);
      const current = links.map((link) => ({ id: link.id, top: Math.abs((document.getElementById(link.id)?.getBoundingClientRect().top ?? Infinity) - 120) })).sort((a, b) => a.top - b.top)[0];
      if (current) setActive(current.id);
    };
    update(); window.addEventListener('scroll', update, { passive: true }); window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, []);

  const navigate = (id: string, href: string) => { setActive(id); setMenuOpen(false); const target = document.getElementById(id); if (target) target.scrollIntoView({ behavior: 'smooth' }); else window.location.href = href; };

  return <header className="site-header">
    <nav className="nav" aria-label="Primary navigation">
      <a className="brand" href="/" aria-label="ModMyRide home"><span className="brand-mark">M</span><span>MODMYRIDE</span></a>
      <form className="header-search" role="search" action="/collection" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); window.location.href = buildCollectionSearchHref(String(form.get('q') ?? '')); }}>
        <label className="sr-only" htmlFor="site-search">Search parts and vehicles</label>
        <input id="site-search" name="q" type="search" placeholder="Search parts, vehicles…" />
        <button type="submit" aria-label="Search">⌕</button>
      </form>
      <div className="nav-center" aria-label="Sections">{links.map((link) => <button className={`nav-item ${active === link.id || pathname === link.href ? 'active' : ''}`} key={link.id} onClick={() => navigate(link.id, link.href)}>{link.label}<span /></button>)}</div>
      <div className="nav-actions"><button className="header-signin cart-link" type="button" aria-label={`Open cart, ${getCartItemCount(lines)} items`} aria-expanded={cartOpen} onClick={() => setCartOpen(true)}>Cart <b>{ready ? getCartItemCount(lines) : '—'}</b></button><span className="nav-status"><i /> Online</span><a className="header-signin" href={isAdmin ? '/admin' : '/account'}>{isAdmin ? 'Admin' : isSignedIn ? 'My garage' : 'Sign in'} <b>↗</b></a><button className={`menu-toggle ${menuOpen ? 'open' : ''}`} aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen(!menuOpen)}><span /><span /></button></div>
    </nav>
    <div className="header-progress"><span style={{ width: `${progress}%` }} /></div>
    <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    <div className={`mobile-menu ${menuOpen ? 'open' : ''}`} id="mobile-menu"><form role="search" action="/collection" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); window.location.href = buildCollectionSearchHref(String(form.get('q') ?? '')); }}><label className="sr-only" htmlFor="mobile-site-search">Search parts and vehicles</label><input id="mobile-site-search" name="q" type="search" placeholder="Search parts, vehicles…" /><button type="submit">Search ↗</button></form>{links.map((link, index) => <button key={link.id} onClick={() => navigate(link.id, link.href)}><small>0{index + 1}</small>{link.label}<em>↗</em></button>)}<a href={isAdmin ? '/admin' : '/account'} onClick={() => setMenuOpen(false)}><small>04</small>{isAdmin ? 'Admin' : isSignedIn ? 'My garage' : 'Account'}<em>↗</em></a></div>
  </header>;
}
