'use client';

import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { SignOutButton } from './sign-out-button';

const sections = [
  { label: 'Overview', href: '/admin', mark: '⌂' },
  { label: 'Orders', href: '/admin/orders', mark: '▤' },
  { label: 'Products', href: '/admin/products', mark: '◇' },
  { label: 'Categories', href: '/admin/categories', mark: '▦' },
  { label: 'Inventory', href: '/admin/inventory', mark: '▥' },
  { label: 'Customers', href: '/admin/customers', mark: '◎' },
  { label: 'Suppliers', href: '/admin/suppliers', mark: '⇄' },
  { label: 'Returns', href: '/admin/returns', mark: '↩' },
  { label: 'Payments', href: '/admin/payments', mark: '₹' },
  { label: 'Reports', href: '/admin/reports', mark: '▥' },
];

export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return <div className="erp-frame">
    <aside className={`erp-sidebar ${menuOpen ? 'open' : ''}`}>
      <a className="erp-brand" href="/admin"><span className="brand-mark">M</span><span>MODMYRIDE<small>OPERATIONS</small></span></a>
      <p className="erp-nav-label">WORKSPACE</p>
      <nav className="erp-nav" aria-label="Admin workspace">
        {sections.map((item) => {
          const active = item.href === '/admin' ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return <a key={item.href} href={item.href} aria-current={active ? 'page' : undefined} className={active ? 'active' : ''} onClick={() => setMenuOpen(false)}><span className="erp-nav-mark" aria-hidden="true">{item.mark}</span>{item.label}</a>;
        })}
      </nav>
      <a className="erp-store-link" href="/">↗ View storefront</a>
    </aside>
    <div className="erp-main-column">
      <header className="erp-topbar">
        <button className="erp-menu-toggle" type="button" aria-expanded={menuOpen} aria-label={menuOpen ? 'Close navigation' : 'Open navigation'} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? '×' : '☰'}</button>
        <span className="erp-topbar-title">Store operations <i>·</i> <b>{sections.find((item) => item.href === pathname)?.label ?? 'Admin'}</b></span>
        <div className="erp-user"><span title={email}>{email}</span><SignOutButton /></div>
      </header>
      <div className="erp-main-content">{children}</div>
    </div>
  </div>;
}
