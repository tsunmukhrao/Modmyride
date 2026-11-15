-- Admin-only aggregate reports. Keep customer data behind the is_admin() gate.
create or replace function public.admin_sales_report(p_from date,p_to date)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_from is null or p_to is null or p_to < p_from or p_to-p_from > 365 then
    raise exception 'Report date range must be valid and no longer than one year';
  end if;

  select jsonb_build_object(
    'summary', jsonb_build_object(
      'revenue', coalesce(sum(o.total),0), 'orders', count(o.id), 'units', coalesce(sum(oi.units),0),
      'taxes', coalesce(sum(o.tax_total),0), 'shipping', coalesce(sum(o.shipping_total),0),
      'discounts', coalesce(sum(o.discount_total),0), 'refunds', coalesce(r.amount,0)
    ),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('date',d.day,'revenue',coalesce(x.revenue,0),'orders',coalesce(x.orders,0)) order by d.day)
      from generate_series(p_from,p_to,interval '1 day') as d(day)
      left join (select o.created_at::date as day,sum(o.total) as revenue,count(*) as orders from public.orders o
        where o.created_at >= p_from and o.created_at < p_to+1 and o.payment_status in ('paid','partially_refunded','refunded') and o.status<>'cancelled' group by 1) x on x.day=d.day), '[]'::jsonb),
    'categories', coalesce((select jsonb_agg(jsonb_build_object('name',coalesce(c.name,'Uncategorized'),'units',q.units,'revenue',q.revenue) order by q.revenue desc)
      from (select p.category_id,sum(oi.quantity) units,sum(oi.quantity*oi.unit_price) revenue from public.order_items oi join public.orders o on o.id=oi.order_id
        join public.products p on p.id=oi.product_id where o.created_at >= p_from and o.created_at < p_to+1 and o.payment_status in ('paid','partially_refunded','refunded') and o.status<>'cancelled' group by p.category_id) q
      left join public.categories c on c.id=q.category_id), '[]'::jsonb),
    'products', coalesce((select jsonb_agg(jsonb_build_object('name',q.name,'sku',q.sku,'units',q.units,'revenue',q.revenue) order by q.revenue desc)
      from (select p.name,p.sku,sum(oi.quantity) units,sum(oi.quantity*oi.unit_price) revenue from public.order_items oi join public.orders o on o.id=oi.order_id
        join public.products p on p.id=oi.product_id where o.created_at >= p_from and o.created_at < p_to+1 and o.payment_status in ('paid','partially_refunded','refunded') and o.status<>'cancelled' group by p.id,p.name,p.sku order by revenue desc limit 20) q), '[]'::jsonb)
  ) into result
  from public.orders o
  left join lateral (select sum(oi.quantity) units from public.order_items oi where oi.order_id=o.id) oi on true
  left join lateral (select sum(rf.amount) amount from public.refunds rf join public.payments py on py.id=rf.payment_id where py.order_id=o.id and rf.status='succeeded') r on true
  where o.created_at >= p_from and o.created_at < p_to+1 and o.payment_status in ('paid','partially_refunded','refunded') and o.status<>'cancelled';
  return result;
end; $$;

create or replace function public.admin_feedback_report(p_from date,p_to date)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_from is null or p_to is null or p_to < p_from or p_to-p_from > 365 then
    raise exception 'Report date range must be valid and no longer than one year';
  end if;

  select jsonb_build_object(
    'summary',jsonb_build_object('reviews',count(*),'average_rating',coalesce(round(avg(r.rating)::numeric,2),0),
      'one_star',count(*) filter(where r.rating=1),'two_star',count(*) filter(where r.rating=2),'five_star',count(*) filter(where r.rating=5)),
    'trend',coalesce((select jsonb_agg(jsonb_build_object('week',w.week,'average_rating',coalesce(x.average_rating,0),'reviews',coalesce(x.reviews,0)) order by w.week)
      from generate_series(date_trunc('week',p_from::timestamp),date_trunc('week',p_to::timestamp),interval '1 week') w(week)
      left join (select date_trunc('week',created_at)::date week,round(avg(rating)::numeric,2) average_rating,count(*) reviews from public.reviews
        where status='approved' and created_at >= p_from and created_at < p_to+1 group by 1) x on x.week=w.week::date), '[]'::jsonb),
    'lowest_rated',coalesce((select jsonb_agg(jsonb_build_object('product',q.product,'sku',q.sku,'average_rating',q.average_rating,'reviews',q.reviews) order by q.average_rating asc,q.reviews desc)
      from (select p.name product,p.sku,round(avg(r.rating)::numeric,2) average_rating,count(*) reviews from public.reviews r join public.products p on p.id=r.product_id
        where r.status='approved' and r.created_at >= p_from and r.created_at < p_to+1 group by p.id,p.name,p.sku order by average_rating asc,reviews desc limit 10) q), '[]'::jsonb),
    'complaint_themes',coalesce((select jsonb_agg(jsonb_build_object('term',t.term,'mentions',t.mentions) order by t.mentions desc,t.term)
      from (select word term,count(*) mentions from public.reviews r cross join lateral regexp_split_to_table(lower(coalesce(r.title,'')||' '||coalesce(r.body,'')),'[^a-z0-9]+') as tokens(word)
        where r.status='approved' and r.rating<=2 and r.created_at >= p_from and r.created_at < p_to+1 and length(word)>=4
          and word not in ('this','that','with','from','have','very','only','product','good','great','quality','after','when','would','there','they','them','does','doesnt','could','should','also','just','more','less','been','were','will','your','into','poor')
        group by word order by mentions desc limit 12) t), '[]'::jsonb)
  ) into result from public.reviews r where r.status='approved' and r.created_at >= p_from and r.created_at < p_to+1;
  return result;
end; $$;

revoke all on function public.admin_sales_report(date,date) from public, anon;
revoke all on function public.admin_feedback_report(date,date) from public, anon;
grant execute on function public.admin_sales_report(date,date) to authenticated;
grant execute on function public.admin_feedback_report(date,date) to authenticated;
