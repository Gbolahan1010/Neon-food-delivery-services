import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useApi } from '../hooks/useApi';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ErrorMessage, Loading, Notice } from '../components/Feedback';
import { capitalise, euro } from '../lib/format';

// Menus read in meal order; any other category goes before desserts and drinks.
const LAST = ['Desserts', 'Drinks'];

function groupByCategory(menu) {
  const groups = new Map();
  for (const dish of menu) {
    const key = dish.category || 'Other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(dish);
  }
  const rank = (name) => LAST.indexOf(name) + 1; // 0 for most categories, 1 or 2 for the last ones
  return [...groups.entries()].sort(([a], [b]) => rank(a) - rank(b));
}

export default function Restaurant() {
  const { id } = useParams();
  const { data, error, loading, reload } = useApi(`/restaurants/${id}`);
  const cart = useCart();
  const { user } = useAuth();
  const [conflict, setConflict] = useState(null);
  const [added, setAdded] = useState('');

  if (loading) return <Loading label="Loading the menu" />;
  if (error) return <ErrorMessage error={error} onRetry={reload} />;

  const { restaurant, menu } = data;
  const canOrder = restaurant.isOpen && (!user || user.role === 'customer');

  function add(dish) {
    if (cart.addItem(restaurant, dish)) {
      setConflict(null);
      setAdded(`${dish.name} added to your basket.`);
    } else {
      setConflict(dish);
    }
  }

  function startNewBasket() {
    cart.startNew(restaurant, conflict);
    setAdded(`${conflict.name} added to a new basket.`);
    setConflict(null);
  }

  return (
    <div className="restaurant-page">
      <header className="restaurant-header">
        {restaurant.imageUrl && <img src={restaurant.imageUrl} alt="" className="restaurant-hero" />}
        <div>
          <h1>{restaurant.name}</h1>
          <p className="lead">{restaurant.description}</p>
          <p className="muted">
            {restaurant.cuisines.map(capitalise).join(', ')}. {restaurant.address.line1},{' '}
            {restaurant.address.city}. Delivers up to {restaurant.deliveryRadiusKm} km.
          </p>
          {!restaurant.isOpen && <Notice tone="warning">Closed right now: try again later.</Notice>}
          {user && user.role !== 'customer' && (
            <Notice>Log in with a customer account to order. You are using a {user.role} account.</Notice>
          )}
        </div>
      </header>

      <div className="menu-layout">
        <div className="menu">
          <p className="visually-hidden" aria-live="polite">
            {added}
          </p>
          {conflict && (
            <div className="alert alert-warning" role="alert">
              <p>
                Your basket has dishes from {cart.restaurant.name}. A basket can only hold one
                restaurant&rsquo;s food.
              </p>
              <div className="actions">
                <button type="button" className="btn btn-small btn-primary" onClick={startNewBasket}>
                  Start a new basket
                </button>
                <button type="button" className="btn btn-small btn-ghost" onClick={() => setConflict(null)}>
                  Keep my basket
                </button>
              </div>
            </div>
          )}

          {menu.length === 0 && <p>This restaurant has not added any dishes yet.</p>}

          {groupByCategory(menu).map(([category, dishes]) => (
            <section key={category} className="menu-section" aria-labelledby={`cat-${category}`}>
              <h2 id={`cat-${category}`}>{category}</h2>
              <ul className="dish-list">
                {dishes.map((dish) => (
                  <li key={dish._id} className="dish">
                    <div className="dish-text">
                      <h3>{dish.name}</h3>
                      {dish.description && <p className="muted">{dish.description}</p>}
                      {dish.dietary?.length > 0 && (
                        <p className="tags">
                          {dish.dietary.map((tag) => (
                            <span key={tag} className={`tag tag-${tag}`}>
                              {capitalise(tag)}
                            </span>
                          ))}
                        </p>
                      )}
                    </div>
                    <div className="dish-buy">
                      <span className="price">{euro(dish.priceCents)}</span>
                      {canOrder && (
                        <button
                          type="button"
                          className="btn btn-small btn-primary"
                          onClick={() => add(dish)}
                          aria-label={`Add ${dish.name} to basket`}
                        >
                          Add
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        {canOrder && (
          <aside className="basket-summary" aria-label="Your basket">
            <h2>Your basket</h2>
            {cart.count === 0 || cart.restaurant?.id !== restaurant._id ? (
              <p className="muted">Add dishes to start an order.</p>
            ) : (
              <>
                <ul className="basket-lines">
                  {cart.items.map((i) => (
                    <li key={i.menuItemId}>
                      <span>
                        {i.quantity} &times; {i.name}
                      </span>
                      <span>{euro(i.priceCents * i.quantity)}</span>
                    </li>
                  ))}
                </ul>
                <p className="basket-total">
                  <span>Food</span>
                  <span>{euro(cart.subtotalCents)}</span>
                </p>
                <Link to="/cart" className="btn btn-primary btn-block">
                  Go to basket
                </Link>
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
