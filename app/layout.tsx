import './globals.css';
import './brutalist.css';
import './header.css';
import './header-search.css';
import './commerce-responsive.css';
import './catalog-responsive-overrides.css';
import './commerce-details.css';
import './cart-drawer.css';
import './feature.css';
import './fitment.css';
import './search.css';
import './all-products.css';
import './product-recommendations.css';
import './account/account.css';
import type { Metadata } from 'next';
import { CartProvider } from '../components/cart-provider';
export const metadata: Metadata = { title: 'MODMYRIDE / AI Automotive Studio', description: 'Premium vehicle upgrades, intelligently matched.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><CartProvider>{children}</CartProvider></body></html>; }
