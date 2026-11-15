'use client';
import { useEffect, useRef, useState } from 'react';
import { PageShell } from '../../components/page-shell';

export default function FitmentPage() {
  const [search, setSearch] = useState('');
  const [vehicle, setVehicle] = useState('');
  const [vehicles, setVehicles] = useState<string[]>([]); const [totalMatches, setTotalMatches] = useState(0); const [nextOffset, setNextOffset] = useState<number | null>(null); const [loadingMore, setLoadingMore] = useState(false);
  const queryRef = useRef(search); const loadMoreAbort = useRef<AbortController | null>(null);
  useEffect(() => {
    queryRef.current = search;
    loadMoreAbort.current?.abort();
    const controller = new AbortController();
    setVehicles([]); setNextOffset(null); setTotalMatches(0);
    const timer = setTimeout(() => {
      fetch(`/api/vehicles?q=${encodeURIComponent(search)}&limit=80`, { signal: controller.signal })
        .then((response) => response.json())
        .then((data) => {
          if (queryRef.current !== search) return;
          setTotalMatches(data.totalMatches ?? 0);
          setVehicles((data.vehicles ?? []).map((item: { make: string; model: string; yearStart: number; yearEnd: number | null }) => `${item.make} ${item.model} · ${item.yearStart}${item.yearEnd ? `–${item.yearEnd}` : '–present'}`));
          setNextOffset(data.nextOffset ?? null);
        }).catch(() => {});
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [search]);
  const loadMore = async () => {
    if (nextOffset === null || loadingMore) return;
    const activeQuery = search; const controller = new AbortController(); loadMoreAbort.current = controller; setLoadingMore(true);
    try {
      const response = await fetch(`/api/vehicles?q=${encodeURIComponent(activeQuery)}&limit=80&offset=${nextOffset}`, { signal: controller.signal });
      const data = await response.json();
      if (queryRef.current !== activeQuery) return;
      const rows = (data.vehicles ?? []).map((item: { make: string; model: string; yearStart: number; yearEnd: number | null }) => `${item.make} ${item.model} · ${item.yearStart}${item.yearEnd ? `–${item.yearEnd}` : '–present'}`);
      setVehicles((current) => [...current, ...rows]); setNextOffset(data.nextOffset ?? null); setTotalMatches(data.totalMatches ?? totalMatches);
    } catch { /* Abort while the query changes; the next query loads a clean page. */ }
    finally { if (queryRef.current === activeQuery) setLoadingMore(false); }
  };
  const onVehicleListScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const element = event.currentTarget;
    if (element.scrollHeight - element.scrollTop - element.clientHeight < 80) void loadMore();
  };
  return <PageShell eyebrow="FITMENT ENGINE / 02" title={<>Make it fit. <em>Make it yours.</em></>} intro="Choose your vehicle and the catalog narrows to upgrades that belong on it. Compatibility is checked before recommendation, not after checkout.">
    <section className="fitment-workspace"><div className="fitment-selector"><p className="eyebrow">YOUR VEHICLE / CLOSEST MATCHES</p><h2>What do you drive?</h2><input className="vehicle-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Start typing your make or model" /><p className="search-count">Showing {vehicles.length.toLocaleString()} of {totalMatches.toLocaleString()} vehicles · scroll for more</p><div className="vehicle-list" onScroll={onVehicleListScroll} aria-label="Vehicle matches">{vehicles.map(item => <button className={vehicle === item ? 'vehicle-choice selected' : 'vehicle-choice'} key={item} onClick={() => setVehicle(item)}><span>{item}</span><span>↗</span></button>)}{loadingMore && <p className="search-count">Loading more vehicles…</p>}</div><button className="button" disabled={!vehicle} onClick={() => document.getElementById('fitment-result')?.scrollIntoView({ behavior: 'smooth' })}>{vehicle ? `Find parts for ${vehicle} →` : 'Select a vehicle first'}</button></div><div id="fitment-result" className="fitment-result"><span className="result-index">FITMENT / LIVE</span>{vehicle ? <><p className="eyebrow">MATCH CONFIRMED</p><h2>{vehicle}</h2><p>Compatibility filters are ready. Your collection will only show products mapped to this vehicle profile.</p><a className="button" href="/collection">View compatible upgrades →</a></> : <><p className="eyebrow">WAITING FOR INPUT</p><h2>Right part.<br /><em>Right machine.</em></h2><p>Pick a vehicle to activate the compatibility layer.</p></>}</div></section>
  </PageShell>;
}
