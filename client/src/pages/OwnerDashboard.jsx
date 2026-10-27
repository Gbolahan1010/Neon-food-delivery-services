import { useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';
import RestaurantForm from '../components/owner/RestaurantForm';
import MenuManager from '../components/owner/MenuManager';
import OwnerOrders from '../components/owner/OwnerOrders';
import { ErrorMessage, Loading, Notice, StatusBadge } from '../components/Feedback';

export default function OwnerDashboard() {
  const { data: restaurants, error, loading, reload, setData } = useApi('/restaurants/mine');
  const [selectedId, setSelectedId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [toggleError, setToggleError] = useState(null);

  if (loading) return <Loading label="Loading your restaurants" />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;

  function created(restaurant) {
    setData([restaurant, ...restaurants]);
    setSelectedId(restaurant._id);
    setAdding(false);
  }

  if (restaurants.length === 0 || adding) {
    return (
      <div className="page-narrow">
        <h1>My restaurant</h1>
        <RestaurantForm onCreated={created} onCancel={restaurants.length ? () => setAdding(false) : null} />
      </div>
    );
  }

  const current = restaurants.find((r) => r._id === selectedId) || restaurants[0];

  async function toggleOpen() {
    setToggleError(null);
    try {
      const res = await api.put(`/restaurants/${current._id}`, { isOpen: !current.isOpen });
      setData(restaurants.map((r) => (r._id === current._id ? res.data : r)));
    } catch (err) {
      setToggleError(err);
    }
  }

  return (
    <div className="owner-page">
      <div className="owner-head">
        <div>
          <h1>{current.name}</h1>
          <p className="owner-status">
            {current.isApproved ? (
              <StatusBadge status="paid">Listed</StatusBadge>
            ) : (
              <StatusBadge status="preparing">Waiting for approval</StatusBadge>
            )}
            {current.isOpen ? (
              <StatusBadge status="placed">Taking orders</StatusBadge>
            ) : (
              <StatusBadge status="cancelled">Closed</StatusBadge>
            )}
          </p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-ghost" onClick={toggleOpen}>
            {current.isOpen ? 'Close for now' : 'Open for orders'}
          </button>
          {current.isApproved && (
            <Link to={`/restaurants/${current._id}`} className="btn btn-ghost">
              View as a customer
            </Link>
          )}
        </div>
      </div>

      {restaurants.length > 1 && (
        <div className="chips" role="group" aria-label="Choose a restaurant">
          {restaurants.map((r) => (
            <button
              key={r._id}
              type="button"
              className="chip"
              aria-pressed={r._id === current._id}
              onClick={() => setSelectedId(r._id)}
            >
              {r.name}
            </button>
          ))}
        </div>
      )}
      <p>
        <button type="button" className="link-button" onClick={() => setAdding(true)}>
          Add another restaurant
        </button>
      </p>

      <ErrorMessage error={toggleError} />
      {!current.isApproved && (
        <Notice>
          Customers cannot see {current.name} yet. An admin will check it soon. You can build the
          menu in the meantime.
        </Notice>
      )}

      <div className="owner-grid">
        <OwnerOrders key={`orders-${current._id}`} restaurantId={current._id} />
        <MenuManager key={`menu-${current._id}`} restaurantId={current._id} />
      </div>
    </div>
  );
}
