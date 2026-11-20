import { products } from '../lib/catalog';
import { HeroScene } from '../components/hero-scene';
import { SiteHeader } from '../components/site-header';
import { RecentlyViewed } from '../components/recently-viewed';
import { CatalogProductActions } from '../components/catalog-product-actions';
import { backendServerFetch } from '../lib/backend-api.server';
import type { Product } from '../lib/catalog';

export default async function Home() {
  const response = await backendServerFetch('/api/search?pageSize=4&sort=popular');
  const payload = response?.ok ? await response.json() as { products?: Product[] } : null;
  const featuredProducts = payload?.products?.length ? payload.products : products.slice(0, 4);
  const liveProductIds = new Set(payload?.products?.map((product) => product.id) ?? []);
  return <main>
    <SiteHeader />
    <section className="hero"><div className="hero-copy"><p className="eyebrow">THE AUTOMOTIVE EDIT / 01</p><h1>Make your<br /><em>machine</em> yours.</h1><p className="hero-text">Curated upgrades for people who see their vehicle as more than transportation. Find your next modification with intelligent search built in.</p><div className="hero-actions"><a className="button" href="/collection">Explore the collection <span>↗</span></a><a className="text-link" href="/fitment">Find parts for my car →</a></div><div className="hero-data"><a href="/collection"><strong>04</strong> CATEGORIES</a><a href="/fitment"><strong>FIT</strong> VEHICLE MATCHING</a><a href="/collection"><strong>24/7</strong> PRODUCT DISCOVERY</a></div></div><div className="hero-visual"><HeroScene /><div className="hero-tag">SCULPTED<br /><strong>FOR YOUR<br />DRIVE</strong></div></div></section>
    <section className="ticker"><span>PRECISION FITMENT</span><i>✦</i><span>INTELLIGENT DISCOVERY</span><i>✦</i><span>BUILT TO STAND OUT</span><i>✦</i></section>
    <section id="shop" className="section"><div className="section-heading"><div><p className="eyebrow">THE COLLECTION / FEATURED</p><h2>Curated upgrades.</h2></div><a className="text-link" href="/collection">View all products →</a></div><div className="product-grid">{featuredProducts.map((p, i) => <article className="product-card" key={p.id}><a href={`/products/${encodeURIComponent(p.id)}`}><div className={`product-art art-${i % 4}`}><img src={p.image} alt={p.name} loading="lazy" /><span>{String(i + 1).padStart(2,'0')}</span><div>{p.category.toUpperCase()}</div></div></a><div className="product-meta"><div><p className="muted">{p.category}</p><h3>{p.name}</h3></div><strong>₹{p.price.toLocaleString('en-IN')}</strong></div><p className="card-desc">{p.description}</p><CatalogProductActions product={p} live={liveProductIds.has(p.id)} /></article>)}</div></section>
    <RecentlyViewed />
    <section id="fitment" className="fitment"><div><p className="eyebrow">FITMENT / YOUR VEHICLE</p><h2>Every upgrade.<br /><em>Right fit.</em></h2><a className="text-link" href="/fitment">Open the fitment engine →</a></div><div className="fitment-panel"><p>Tell us what you drive and we’ll narrow the collection to what belongs on it.</p><div className="select-row"><a className="button fitment-cta" href="/fitment">Find my fit →</a></div></div></section>
    <footer><div className="brand"><span className="brand-mark">M</span> MODMYRIDE</div><span>Built for the road ahead.</span><span>© 2026</span></footer>
  </main>;
}
