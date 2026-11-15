import { AuthForm } from '../../components/auth-form';
import { SignOutButton } from '../../components/sign-out-button';
import { getCurrentIdentity } from '../../lib/auth';
import { backendServerFetch } from '../../lib/backend-api.server';
import { OrderRequestActions } from '../../components/order-request-actions';

type AccountPageProps = { searchParams: Promise<{ error?: string; mode?: string; next?: string }> };
type AccountOrder = {
  id: string; status: string; payment_status: string; total: number; currency: string; created_at: string;
  shipments?: { courier?: string; tracking_number?: string; tracking_url?: string; eta?: string } | Array<{ courier?: string; tracking_number?: string; tracking_url?: string; eta?: string }> | null;
  payments?: Array<{ provider: string; provider_payment_id?: string; method?: string; status: string; amount: number; currency: string; created_at: string; refunds?: Array<{ amount: number; status: string; reason?: string }> }>;
  order_items?: Array<{ line_id: string }>;
  order_requests?: Array<{ id: string; kind: string; status: string; reason: string; created_at: string }>;
  order_status_history?: Array<{ new_status: string; note?: string; created_at: string }>;
};

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const params = await searchParams;
  const identity = await getCurrentIdentity();
  const ordersResponse = identity ? await backendServerFetch('/api/account/orders') : null;
  const orders = ordersResponse?.ok ? await ordersResponse.json() as { orders: AccountOrder[] } : { orders: [] };
  const notice = params.error === 'admin-required' ? 'That area is restricted to administrator accounts.' : '';
  const mode = params.mode === 'recovery' ? 'recovery' : params.mode === 'reset' ? 'reset' : 'signin';

  return <main className="account-page">
    <nav className="nav"><a className="brand" href="/"><span className="brand-mark">M</span> MODMYRIDE</a><a className="text-link" href="/">← Back to store</a></nav>
    <section className="account-shell">
      {identity && mode !== 'recovery' ? <>
        <p className="eyebrow">GARAGE / YOUR PROFILE</p>
        <h1>Your garage.</h1>
        <div className="account-grid">
          <div className="account-card"><p className="eyebrow">PROFILE</p><h3>{identity.profile?.full_name || identity.user.email}</h3><p className="muted">{identity.user.email}</p><p className="muted">{identity.profile?.phone || 'Add a phone number to your profile.'}</p>{identity.role === 'admin' && <a className="text-link" href="/admin">Open admin panel →</a>}<SignOutButton /></div>
          <div className="account-card"><p className="eyebrow">SAVED VEHICLE</p><h3>{identity.profile?.vehicle_make ? `${identity.profile.vehicle_make} ${identity.profile.vehicle_model ?? ''}` : 'Choose your vehicle.'}</h3><p className="muted">{identity.profile?.vehicle_year ?? 'Fitment personalizes your parts search.'}</p><a className="ghost account-action" href="/fitment">Set vehicle</a></div>
          <div className="account-card account-wide"><p className="eyebrow">ORDER HISTORY / DELIVERY STATUS</p>{orders.orders?.length ? <div className="account-order-list">{orders.orders.map((order) => {
            const shipment = Array.isArray(order.shipments) ? order.shipments[0] : order.shipments;
            const payments = Array.isArray(order.payments) ? order.payments : [];
            return <article className="account-order" key={order.id}>
              <div className="account-order-top"><div><strong>ORDER #{order.id.slice(0, 8).toUpperCase()}</strong><span className="muted">{new Date(order.created_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })} · {order.order_items?.length ?? 0} items</span></div><strong>₹{Number(order.total).toLocaleString('en-IN')}</strong></div>
              <div className="account-order-status"><span className={`order-pill ${order.status}`}>{order.status.replaceAll('_', ' ')}</span><span className="muted">Payment: {order.payment_status.replaceAll('_', ' ')}</span>{shipment?.eta && order.status !== 'delivered' && <span className="muted">Estimated {new Date(shipment.eta).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>}</div>
              <a className="text-link" href={`/account/orders/${encodeURIComponent(order.id)}/invoice`}>View / print invoice →</a>
              <OrderRequestActions orderId={order.id} status={order.status} requests={order.order_requests ?? []} />
              {payments.length ? <div className="shipment-tracking"><span>TRANSACTION HISTORY</span>{payments.map((payment, index) => <span key={`${payment.provider_payment_id ?? payment.created_at}-${index}`}>{payment.provider.toUpperCase()} · {payment.method || 'payment'} · {payment.status.replaceAll('_', ' ')} · {payment.currency} {Number(payment.amount).toLocaleString('en-IN')}{payment.provider_payment_id ? ` · Ref ${payment.provider_payment_id}` : ''}{payment.refunds?.map((refund, refundIndex) => ` · Refund ${refund.status}: ${payment.currency} ${Number(refund.amount).toLocaleString('en-IN')}`).join('')}</span>)}</div> : null}
              {shipment?.tracking_number ? <div className="shipment-tracking"><span>{shipment.courier || 'Carrier'} · {shipment.tracking_number}</span>{shipment.tracking_url && <a className="text-link" href={shipment.tracking_url} target="_blank" rel="noreferrer">Track package ↗</a>}</div> : <p className="muted shipment-pending">{order.status === 'delivered' ? 'Delivered successfully.' : order.status === 'cancelled' ? 'This order was cancelled.' : order.payment_status === 'paid' ? 'Tracking details will appear here when your order ships.' : 'Payment confirmation is pending.'}</p>}
              {order.order_status_history?.length ? <ol className="order-timeline" aria-label={`Status timeline for order ${order.id.slice(0, 8)}`}>{[...order.order_status_history].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)).map((event, index) => <li key={`${event.created_at}-${index}`}><span className="timeline-dot" /><div><strong>{event.new_status.replaceAll('_', ' ')}</strong><time dateTime={event.created_at}>{new Date(event.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</time>{event.note && <span className="muted">{event.note}</span>}</div></li>)}</ol> : null}
            </article>;
          })}</div> : <><h3>No orders yet.</h3><p className="muted">Your order history and delivery tracking will appear here after checkout.</p></>}<a className="text-link" href="/collection">Explore the collection →</a></div>
        </div>
      </> : <>
        <p className="eyebrow">GARAGE / YOUR PROFILE</p>
        <h1>Make every upgrade<br /><em>fit your life.</em></h1>
        <AuthForm initialMode={mode} notice={notice} redirectTo={params.next ?? '/account'} />
      </>}
    </section>
  </main>;
}
