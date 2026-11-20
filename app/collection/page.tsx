'use client';

import { useEffect, useMemo, useState } from 'react';
import { PageShell } from '../../components/page-shell';
import { ALL_PRODUCTS_PAGE_SIZE, getSearchSuggestions, products as fallbackProducts, type Product } from '../../lib/catalog';
import { readCollectionSearchQuery } from '../../lib/search-url';
import { findVehicleByKey, vehicleOptionLabel, vehicleOptionValue, type VehicleOption } from '../../lib/vehicle-options';
import { indiaVehicles } from '../../lib/india-vehicles';
import { sortAndFilterProducts, type CatalogSort } from '../../lib/catalog-discovery';
import { CatalogProductActions } from '../../components/catalog-product-actions';

export default function CollectionPage() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [brand, setBrand] = useState('');
  const [inStock, setInStock] = useState(false);
  const [rating, setRating] = useState('');
  const [sort, setSort] = useState<CatalogSort>('relevance');
  const [results, setResults] = useState<Product[]>(fallbackProducts);
  const [liveProductIds, setLiveProductIds] = useState<Set<string>>(() => new Set());
  const [catalogChecked, setCatalogChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleOption[]>(indiaVehicles);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesUnavailable, setVehiclesUnavailable] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/vehicles?limit=500', { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(4000)]) })
      .then((response) => {
        if (!response.ok) throw new Error('Vehicle list unavailable');
        return response.json();
      })
      .then((data) => setVehicles(data.vehicles ?? []))
      .catch(() => { if (!controller.signal.aborted) { setVehicles(indiaVehicles); setVehiclesUnavailable(true); } })
      .finally(() => { if (!controller.signal.aborted) setVehiclesLoading(false); });
    return () => controller.abort();
  }, []);

  const search = async (nextQuery: unknown = query, filters = { category, vehicle, minPrice, maxPrice, brand, inStock, rating, sort }) => {
    const activeQuery = typeof nextQuery === 'string' ? nextQuery : query;
    const selectedVehicle = findVehicleByKey(vehicles, filters.vehicle);
    setBusy(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: activeQuery,
          sort: filters.sort,
          category: filters.category,
          brand: filters.brand || undefined,
          inStock: filters.inStock ? true : undefined,
          rating: filters.rating ? Number(filters.rating) : undefined,
          make: selectedVehicle?.make,
          model: selectedVehicle?.model,
          minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
          maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
          pageSize: ALL_PRODUCTS_PAGE_SIZE,
        }),
      });
      if (!response.ok) throw new Error('Search unavailable');
      const data = await response.json();
      const nextResults = (data.products ?? []) as Product[];
      setLiveProductIds(new Set(nextResults.map((product) => product.id)));
      setCatalogChecked(true);
      setResults(sortAndFilterProducts(nextResults, { query: activeQuery, category: filters.category, brand: filters.brand || undefined, inStock: filters.inStock ? true : undefined, rating: filters.rating ? Number(filters.rating) : undefined, minPrice: filters.minPrice ? Number(filters.minPrice) : undefined, maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined, sort: filters.sort }));
    } catch {
      setLiveProductIds(new Set());
      setCatalogChecked(true);
      setResults(sortAndFilterProducts(fallbackProducts, { query: activeQuery, category: filters.category, vehicle: selectedVehicle ? `${selectedVehicle.make} ${selectedVehicle.model}` : undefined, brand: filters.brand || undefined, inStock: filters.inStock ? true : undefined, rating: filters.rating ? Number(filters.rating) : undefined, minPrice: filters.minPrice ? Number(filters.minPrice) : undefined, maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined, sort: filters.sort }));
    } finally {
      setBusy(false);
    }
  };

  const showAllProducts = () => {
    const noFilters = { category: '', vehicle: '', minPrice: '', maxPrice: '', brand: '', inStock: false, rating: '', sort: 'relevance' as CatalogSort };
    setQuery('');
    setCategory('');
    setVehicle('');
    setMaxPrice('');
    setMinPrice(''); setBrand(''); setInStock(false); setRating(''); setSort('relevance');
    void search('', noFilters);
  };

  useEffect(() => {
    const initialQuery = readCollectionSearchQuery(window.location.search);
    if (initialQuery) setQuery(initialQuery);
  }, []);
  useEffect(() => {
    const timer = setTimeout(search, 250);
    return () => clearTimeout(timer);
  }, [category, vehicle, minPrice, maxPrice, brand, inStock, rating, sort, query, vehicles]);

  const suggestionPool = useMemo(() => Array.from(new Set([
    ...fallbackProducts.map((product) => product.name),
    ...fallbackProducts.flatMap((product) => product.tags),
    ...fallbackProducts.map((product) => product.category),
    ...fallbackProducts.flatMap((product) => product.vehicles),
  ])), []);
  const suggestions = getSearchSuggestions(query, suggestionPool, ['Ford EcoSport accessories', 'Ford Figo maintenance parts', 'Interior upgrades under ₹10k']);
  const vehicleOptions = vehicles.map((item) => <option key={vehicleOptionValue(item)} value={vehicleOptionValue(item)}>{vehicleOptionLabel(item)}</option>);
  const vehiclePlaceholder = vehiclesLoading ? 'India vehicles (Ford first)…' : 'Every vehicle';
  const activeFilterCount = [category, vehicle, minPrice, maxPrice, brand, inStock, rating].filter(Boolean).length;
  const heroSearch = <div className="collection-search-hero">
    <div className="hero-search-main"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && search()} placeholder="Search parts, vehicle, or SKU..." aria-label="Search parts, vehicles, and upgrades" aria-autocomplete="list" aria-expanded={suggestions.length > 0} aria-controls="collection-search-suggestions" /><button type="button" onClick={() => search()}>{busy ? 'SEARCHING…' : 'SEARCH ↗'}</button></div>
    {suggestions.length > 0 && <div className="search-suggestions" id="collection-search-suggestions" role="listbox" aria-label="Search suggestions"><span>QUICK SEARCHES</span>{suggestions.map((suggestion, index) => <button type="button" role="option" aria-selected="false" key={`${suggestion.label}-${index}`} onClick={() => { setQuery(suggestion.query); void search(suggestion.query); }}>{suggestion.label}<b aria-hidden="true">↗</b></button>)}</div>}
    <div className="search-hero-footer"><span>Search by product, fitment, or SKU</span><a href="#catalog-filters">BROWSE FILTERS ↓</a></div>
  </div>;

  return <PageShell eyebrow="THE COLLECTION / PARTS SEARCH" title={<>Parts with <em>presence.</em></>} intro="Search products by name, SKU, vehicle, or category. Filter to your exact car and browse upgrades that fit your drive." heroExtra={heroSearch}>
    <section className="catalog-layout"><aside className="filter-panel" id="catalog-filters" aria-label="Catalog filters"><div className="filter-panel-heading"><div><span className="eyebrow">REFINE YOUR SEARCH</span><h2>Find your fit.</h2></div><span className="filter-count">{activeFilterCount ? `${activeFilterCount} ON` : 'ALL ITEMS'}</span></div>
      <div className="filter-panel-body"><div className="keyword-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && search()} placeholder="Part, vehicle, or SKU" aria-label="Search catalog" /><button type="button" onClick={() => search()} aria-label="Search catalog">↗</button></div>
      <div className="filter-group"><span className="filter-group-title">FITMENT</span><label>Vehicle<select value={vehicle} onChange={(event) => setVehicle(event.target.value)}><option value="">{vehiclePlaceholder}</option>{vehicleOptions}</select></label></div>
      <div className="filter-group"><span className="filter-group-title">PRODUCT</span><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All categories</option><option>Exterior</option><option>Interior</option><option>Wheels &amp; Tyres</option><option>Lighting</option><option>Safety &amp; Maintenance</option><option>Car Care &amp; Utility</option><option>Audio &amp; Tech</option><option>Performance</option></select></label>
      <label>Brand<select value={brand} onChange={(event) => setBrand(event.target.value)}><option value="">All brands</option>{Array.from(new Set([...results, ...fallbackProducts].map((product) => product.brand).filter((value): value is string => Boolean(value)))).sort().map((value) => <option key={value}>{value}</option>)}</select></label></div>
      <div className="filter-group"><span className="filter-group-title">PRICE & QUALITY</span><label>Maximum price<select value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)}><option value="">Any budget</option><option value="10000">Under ₹10k</option><option value="50000">Under ₹50k</option><option value="70000">Under ₹70k</option></select></label>
      <label>Minimum price<input type="number" min="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder="₹0" /></label>
      <label>Minimum rating<select value={rating} onChange={(event) => setRating(event.target.value)}><option value="">Any rating</option><option value="4">4★ and up</option><option value="3">3★ and up</option></select></label></div>
      <label className="stock-filter"><input type="checkbox" checked={inStock} onChange={(event) => setInStock(event.target.checked)} /><span><b>Available now</b><small>Show items ready to ship</small></span></label>
      <button className="clear-filters" type="button" onClick={showAllProducts} disabled={!query && !activeFilterCount}>Clear search &amp; filters <span aria-hidden="true">↺</span></button>
      {vehiclesUnavailable && <p className="search-note">Showing the saved India vehicle list while live fitment data is unavailable.</p>}</div></aside>
      <div className="catalog-results"><div className="results-head"><div><span>{results.length} matching upgrades</span><span className="muted">{query ? `For “${query}”` : 'Curated catalog'}</span></div><label>Sort by <select value={sort} onChange={(event) => setSort(event.target.value as CatalogSort)}><option value="relevance">Relevance</option><option value="popular">Popularity</option><option value="price-asc">Price: low to high</option><option value="price-desc">Price: high to low</option><option value="rating">Top rated</option><option value="newest">Newest</option></select></label></div>{results.length ? <div className="product-grid">{results.map((p, i) => <article className="product-card" key={p.id}><a href={`/products/${encodeURIComponent(p.id)}`}><div className={`product-art art-${i % 4}`}><img src={p.image} alt={p.name} loading="lazy" /><span>{String(i + 1).padStart(2,'0')}</span><div>{p.category.toUpperCase()}</div></div></a><div className="product-meta"><div><p className="muted">{p.category}</p><h3>{p.name}</h3></div><strong>₹{p.price.toLocaleString('en-IN')}</strong></div><p className="card-desc">{p.description}</p><CatalogProductActions product={p} live={catalogChecked && liveProductIds.has(p.id)} /><a className="text-link product-link" href={`/products/${encodeURIComponent(p.id)}`}>View details →</a></article>)}</div> : <div className="empty-search"><p className="eyebrow">NO MATCHES / TRY AGAIN</p><h2>Nothing in the garage yet.</h2><p>Try a broader vehicle, category, or exact part name or SKU.</p><button className="text-link" onClick={showAllProducts}>Clear all filters →</button></div>}</div>
    </section>
  </PageShell>;
}
