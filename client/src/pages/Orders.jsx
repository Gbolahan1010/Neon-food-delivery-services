import { Link } from 'react-router';
import { useApi } from '../hooks/useApi';
import { EmptyState, ErrorMessage, Loading, StatusBadge } from '../components/Feedback';
import { dateTime, euro, statusLabel } from '../lib/format';

export default function Orders() {
  const { data: orders, error, loading, reload } = useApi('/orders/mine?limit=50');

  if (loading) return <Loading label="Loading your orders" />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;

  if (orders.length === 0) {
    return (
      <EmptyState title="No orders yet">
        <p>When you order food, you can follow it here.</p>
        <Link to="/" className="btn btn-primary">
          Browse restaurants
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="page-narrow">
      <h1>My orders</h1>
      <ul className="order-list">
        {orders.map((order) => (
          <li key={order._id}>
            <Link to={`/orders/${order._id}`} className="order-row">
              <span className="order-row-main">
                <strong>{order.restaurant?.name || 'Restaurant removed'}</strong>
                <span className="muted">
                  {dateTime(order.createdAt)}, {order.items.reduce((n, i) => n + i.quantity, 0)} items
                </span>
              </span>
              <span className="order-row-side">
                <StatusBadge status={order.status}>{statusLabel(order.status)}</StatusBadge>
                {order.paymentStatus !== 'paid' && order.status !== 'cancelled' && (
                  <StatusBadge status="unpaid">Not paid</StatusBadge>
                )}
                <span className="price">{euro(order.totalCents)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
