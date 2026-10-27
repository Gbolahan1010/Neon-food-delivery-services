import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { api } from '../api/client';
import { useApi, usePolling } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import StatusTracker from '../components/StatusTracker';
import { ErrorMessage, Loading, Notice, StatusBadge } from '../components/Feedback';
import { dateTime, euro } from '../lib/format';

const FINISHED = ['delivered', 'cancelled'];

export default function Order() {
  const { id } = useParams();
  const [params, setParams] = useSearchParams();
  const { user } = useAuth();
  const { clear: clearCart } = useCart();
  const { data: order, error, loading, reload } = useApi(`/orders/${id}`);
  const [actionError, setActionError] = useState(null);
  const [busy, setBusy] = useState('');
  const [paymentNote, setPaymentNote] = useState(null);
  const confirmed = useRef(false);

  const payment = params.get('payment');
  const sessionId = params.get('session_id');

  // Back from Stripe: ask the API to check the payment with Stripe (the webhook may be slower).
  useEffect(() => {
    if (payment === 'success' && sessionId && !confirmed.current) {
      confirmed.current = true;
      clearCart();
      api
        .get(`/payments/confirm?session_id=${encodeURIComponent(sessionId)}`)
        .then(() => setPaymentNote({ tone: 'success', text: 'Payment received. Thank you.' }))
        .catch(() =>
          setPaymentNote({
            tone: 'info',
            text: 'Stripe is still confirming your payment. This page will update by itself.',
          })
        )
        .finally(() => {
          reload({ quiet: true });
          setParams({}, { replace: true });
        });
    } else if (payment === 'cancelled') {
      setPaymentNote({ tone: 'warning', text: 'Payment was cancelled. Your order is saved: you can pay below.' });
      setParams({}, { replace: true });
    } else if (payment === 'unavailable') {
      setPaymentNote({ tone: 'warning', text: 'Your order is saved, but the payment page could not open. Try paying below.' });
      setParams({}, { replace: true });
    }
  }, [payment, sessionId, clearCart, reload, setParams]);

  const refresh = useCallback(() => reload({ quiet: true }), [reload]);
  usePolling(refresh, 10000, Boolean(order) && !FINISHED.includes(order.status));

  if (loading) return <Loading label="Loading your order" />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;

  const isCustomer = user?.role === 'customer';
  const unpaid = order.paymentStatus !== 'paid';
  const canPay = isCustomer && unpaid && order.status !== 'cancelled';
  // Paid orders need a refund, so the customer can only cancel before paying.
  const canCancel = isCustomer && unpaid && order.status === 'placed';

  async function pay() {
    setBusy('pay');
    setActionError(null);
    try {
      const res = await api.post('/payments/checkout', { orderId: order._id });
      window.location.assign(res.data.url);
    } catch (err) {
      setActionError(err);
      setBusy('');
    }
  }

  async function cancel() {
    setBusy('cancel');
    setActionError(null);
    try {
      await api.patch(`/orders/${order._id}/status`, { status: 'cancelled' });
      await reload({ quiet: true });
    } catch (err) {
      setActionError(err);
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="order-page">
      <p className="back-link">
        <Link to={isCustomer ? '/orders' : user?.role === 'owner' ? '/owner' : '/'}>
          {isCustomer ? 'All my orders' : 'Back'}
        </Link>
      </p>
      <h1>{order.restaurant?.name || 'Your order'}</h1>
      <p className="muted">
        Ordered {dateTime(order.createdAt)}.{' '}
        {unpaid ? (
          <StatusBadge status="unpaid">Not paid</StatusBadge>
        ) : (
          <StatusBadge status="paid">Paid</StatusBadge>
        )}
      </p>

      <div aria-live="polite">
        {paymentNote && <Notice tone={paymentNote.tone}>{paymentNote.text}</Notice>}
      </div>

      <section className="tracker-panel" aria-labelledby="progress-title">
        <h2 id="progress-title" className="visually-hidden">
          Progress
        </h2>
        <StatusTracker order={order} />
        {!FINISHED.includes(order.status) && (
          <p className="tracker-note">This page refreshes every few seconds.</p>
        )}
      </section>

      <ErrorMessage error={actionError} />
      {(canPay || canCancel) && (
        <div className="actions">
          {canPay && (
            <button type="button" className="btn btn-primary" onClick={pay} disabled={busy !== ''}>
              {busy === 'pay' ? 'Opening secure payment...' : `Pay ${euro(order.totalCents)}`}
            </button>
          )}
          {canCancel && (
            <button type="button" className="btn btn-ghost" onClick={cancel} disabled={busy !== ''}>
              {busy === 'cancel' ? 'Cancelling...' : 'Cancel order'}
            </button>
          )}
        </div>
      )}

      <div className="order-details">
        <section aria-labelledby="items-title">
          <h2 id="items-title">What you ordered</h2>
          <ul className="basket-lines">
            {order.items.map((item) => (
              <li key={item.menuItem}>
                <span>
                  {item.quantity} &times; {item.name}
                </span>
                <span>{euro(item.priceCents * item.quantity)}</span>
              </li>
            ))}
          </ul>
          <p className="basket-total">
            <span>Food</span>
            <span>{euro(order.subtotalCents)}</span>
          </p>
          <p className="basket-total">
            <span>
              Delivery
              {order.deliveryDistanceKm != null ? ` (${order.deliveryDistanceKm} km)` : ''}
            </span>
            <span>{euro(order.deliveryFeeCents)}</span>
          </p>
          <p className="basket-total basket-grand">
            <span>Total</span>
            <span>{euro(order.totalCents)}</span>
          </p>
        </section>
        <section aria-labelledby="address-title">
          <h2 id="address-title">Delivering to</h2>
          <address>
            {order.deliveryAddress.line1}
            <br />
            {order.deliveryAddress.line2 && (
              <>
                {order.deliveryAddress.line2}
                <br />
              </>
            )}
            {order.deliveryAddress.city} {order.deliveryAddress.eircode}
          </address>
          {order.notes && (
            <p>
              <strong>Note:</strong> {order.notes}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
