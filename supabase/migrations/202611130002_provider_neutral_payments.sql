-- Make payment event handling provider-neutral. Apply only after the Python
-- backend payment webhook has been deployed and the legacy Razorpay handler is retired.
drop index if exists public.payments_one_pending_razorpay_order_uidx;
create unique index if not exists payments_one_pending_provider_order_uidx
  on public.payments(order_id, provider) where status='pending';

drop function if exists public.apply_razorpay_event(text,text,text,int,text,text,jsonb);

create or replace function public.apply_payment_event(
  p_provider text, p_gateway_order_id text, p_payment_id text, p_outcome text,
  p_amount_minor int, p_currency text, p_event_id text, p_payload jsonb
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  payment_row public.payments%rowtype;
  order_row public.orders%rowtype;
  item_row public.order_items%rowtype;
  stock_row public.inventory%rowtype;
  variant_row public.product_variants%rowtype;
  new_status text;
begin
  if p_provider is null or p_provider !~ '^[a-z0-9][a-z0-9_-]{0,59}$'
    or p_outcome not in ('captured','failed') or p_event_id is null
    or length(p_event_id)>200 or p_payment_id is null then
    raise exception 'Invalid payment event';
  end if;
  select * into payment_row from public.payments
    where provider=p_provider and provider_reference=p_gateway_order_id for update;
  if not found then raise exception 'Payment order not found'; end if;
  select * into order_row from public.orders where id=payment_row.order_id for update;
  if not found then raise exception 'Store order not found'; end if;
  if round(payment_row.amount*100)::int <> p_amount_minor or payment_row.currency<>p_currency then
    raise exception 'Payment amount or currency mismatch';
  end if;
  insert into public.webhook_events(provider,event_id,payload)
    values(p_provider,p_event_id,coalesce(p_payload,'{}')) on conflict(provider,event_id) do nothing;
  if not found then return jsonb_build_object('duplicate',true,'order_id',order_row.id); end if;

  if p_outcome='captured' then
    if order_row.payment_status<>'paid' then
      update public.payments set status='paid',provider_payment_id=p_payment_id,
        raw_event=coalesce(p_payload,'{}'),updated_at=now() where id=payment_row.id;
      update public.orders set status='confirmed',payment_status='paid' where id=order_row.id;
      for item_row in select * from public.order_items where order_id=order_row.id order by product_id loop
        if item_row.variant_id is not null then
          select * into variant_row from public.product_variants where id=item_row.variant_id for update;
          if not found or variant_row.reserved<item_row.quantity or variant_row.quantity<item_row.quantity then
            raise exception 'Reserved variant stock invariant failed';
          end if;
          update public.product_variants set quantity=quantity-item_row.quantity,reserved=reserved-item_row.quantity,updated_at=now()
            where id=item_row.variant_id;
        else
          select * into stock_row from public.inventory where product_id=item_row.product_id for update;
          if not found or stock_row.reserved<item_row.quantity or stock_row.quantity<item_row.quantity then
            raise exception 'Reserved stock invariant failed';
          end if;
          update public.inventory set quantity=quantity-item_row.quantity,reserved=reserved-item_row.quantity,updated_at=now()
            where product_id=item_row.product_id;
        end if;
        insert into public.stock_movements(product_id,delta,reason,reference_id)
          values(item_row.product_id,-item_row.quantity,'payment_captured',order_row.id);
      end loop;
      insert into public.order_status_history(order_id,old_status,new_status,note)
        values(order_row.id,order_row.status,'confirmed','Payment captured');
    end if;
    new_status := 'paid';
  else
    update public.payments set status='failed',provider_payment_id=p_payment_id,
      raw_event=coalesce(p_payload,'{}'),updated_at=now() where id=payment_row.id and status<>'paid';
    if order_row.payment_status<>'paid' then
      if exists(select 1 from public.payments where order_id=order_row.id and status='pending' and id<>payment_row.id) then
        update public.orders set payment_status='pending' where id=order_row.id;
      else
        update public.orders set payment_status='failed' where id=order_row.id;
      end if;
    end if;
    new_status := 'failed';
  end if;
  update public.webhook_events set processed_at=now() where provider=p_provider and event_id=p_event_id;
  return jsonb_build_object('duplicate',false,'order_id',order_row.id,'payment_status',new_status);
end; $$;

revoke all on function public.apply_payment_event(text,text,text,text,int,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.apply_payment_event(text,text,text,text,int,text,text,jsonb) to service_role;
