-- Permit transaction history reads only when the linked order belongs to the caller.
create policy payments_customer_read on public.payments for select using (
  exists(select 1 from public.orders o where o.id=payments.order_id and o.user_id=auth.uid())
);
create policy refunds_customer_read on public.refunds for select using (
  exists(select 1 from public.payments py join public.orders o on o.id=py.order_id
    where py.id=refunds.payment_id and o.user_id=auth.uid())
);
