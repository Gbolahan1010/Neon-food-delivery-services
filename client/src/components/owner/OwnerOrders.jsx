import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../../api/client';
import { useApi, usePolling } from '../../hooks/useApi';
import { ErrorMessage, Loading, StatusBadge } from '../Feedback';
import { dateTime, euro, statusLabel } from '../../lib/format';

/** The one next step a kitchen takes for each status, named as the action. */
const NEXT_STEP = {
  placed: { status: 'preparing', label: 'Start preparing' },
  preparing: { status: 'out_for_delivery', label: 'Send out for delivery' },
  out_for_delivery: { status: 'delivered', label: 'Mark delivered' },
};

const FINISHED = ['delivered', 'cancelled'];

/** Incoming orders for one restaurant. Refreshes every 15 seconds so new orders appear. */
export default function OwnerOrders({ restaurantId }) {
  const { data: orders, error, loading, reload, setData } = useApi(
    `/orders/restaurant/${restaurantId}?limit=50`
  );
  const [actionError, setActionError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [showFinished, setShowFinished] = useState(false);

  const refresh = useCallback(() => reload({ quiet: true }), [reload]);
  usePolling(refresh, 15000, true);

  async function move(order, status) {
    setBusyId(order._id);
    setActionError(null);
    try {
      const res = await api.patch(`/orders/${order._id}/status`, { status });
      // Keep the populated customer from the list; take the new status from the API.
      setData(orders.map((o) => (o._id === order._id ? { ...o, ...res.data, customer: o.customer } : o)));
    } catch (err) {
      setActionError(err);
    } finally {
      setBusyId(null);
    }
  }

  const active = orders?.filter((o) => !FINISHED.includes(o.status)) || [];
  const finished = orders?.filter((o) => FINISHED.includes(o.status)) || [];
  const shown = showFinished ? finished : active;

  return (
    <section className="owner-section" aria-labelledby="orders-title">
      <div className="section-head">
        <h2 id="orders-title">Orders</h2>
        <div className="chips" role="group" aria-label="Which orders">
          <button type="button" className="chip" aria-pressed={!showFinished} onClick={() => setShowFinished(false)}>
            To do ({active.length})
          </button>
          <button type="button" className="chip" aria-pressed={showFinished} onClick={() => setShowFinished(true)}>
            Finished ({finished.length})
          </button>
        </div>
      </div>

      {loading && <Loading label="Loading orders" />}
      <ErrorMessage error={error} onRetry={reload} />
      <ErrorMessage error={actionError} />

      {orders && shown.length === 0 && (
        <p className="muted">
          {showFinished ? 'No finished orders yet.' : 'No orders waiting. New orders appear here automatically.'}
        </p>
      )}

      <ul className="kitchen-list">
        {shown.map((order) => {
          const next = NEXT_STEP[order.status];
          return (
            <li key={order._id} className={`kitchen-ticket ticket-${order.status}`}>
              <div className="ticket-head">
                <strong>{order.customer?.name || 'Customer'}</strong>
                <StatusBadge status={order.status}>{statusLabel(order.status)}</StatusBadge>
                {order.paymentStatus === 'paid' ? (
                  <StatusBadge status="paid">Paid</StatusBadge>
                ) : (
                  <StatusBadge status="unpaid">Not paid</StatusBadge>
                )}
              </div>
              <ul className="ticket-items">
                {order.items.map((item) => (
                  <li key={item.menuItem}>
                    {item.quantity} &times; {item.name}
                  </li>
                ))}
              </ul>
              {order.notes && <p className="ticket-note">Note: {order.notes}</p>}
              <p className="muted small">
                {dateTime(order.createdAt)}. To {order.deliveryAddress.line1}, {order.deliveryAddress.city}.{' '}
                {euro(order.totalCents)}. <Link to={`/orders/${order._id}`}>Details</Link>
              </p>
              {(next || order.status === 'placed') && (
                <div className="actions">
                  {next && (
                    <button
                      type="button"
                      className="btn btn-small btn-primary"
                      disabled={busyId === order._id}
                      onClick={() => move(order, next.status)}
                    >
                      {next.label}
                    </button>
                  )}
                  {order.status === 'placed' && (
                    <button
                      type="button"
                      className="btn btn-small btn-ghost"
                      disabled={busyId === order._id}
                      onClick={() => move(order, 'cancelled')}
                    >
                      Reject order
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
