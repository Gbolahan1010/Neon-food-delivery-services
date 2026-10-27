import { Link } from 'react-router';
import { useCart } from '../context/CartContext';
import { EmptyState } from '../components/Feedback';
import { euro } from '../lib/format';

export default function Cart() {
  const cart = useCart();

  if (cart.count === 0) {
    return (
      <EmptyState title="Your basket is empty">
        <p>Pick a restaurant and add a few dishes.</p>
        <Link to="/" className="btn btn-primary">
          Browse restaurants
        </Link>
      </EmptyState>
    );
  }

  return (
    <div className="page-narrow">
      <h1>Your basket</h1>
      <p className="lead">
        From <Link to={`/restaurants/${cart.restaurant.id}`}>{cart.restaurant.name}</Link>
      </p>

      <ul className="cart-lines">
        {cart.items.map((item) => (
          <li key={item.menuItemId} className="cart-line">
            <span className="cart-name">{item.name}</span>
            <div className="stepper" role="group" aria-label={`Quantity of ${item.name}`}>
              <button
                type="button"
                onClick={() => cart.setQuantity(item.menuItemId, item.quantity - 1)}
                aria-label={item.quantity === 1 ? `Remove ${item.name}` : `One less ${item.name}`}
              >
                &minus;
              </button>
              <span aria-live="polite">{item.quantity}</span>
              <button
                type="button"
                onClick={() => cart.setQuantity(item.menuItemId, Math.min(50, item.quantity + 1))}
                aria-label={`One more ${item.name}`}
              >
                +
              </button>
            </div>
            <span className="price">{euro(item.priceCents * item.quantity)}</span>
          </li>
        ))}
      </ul>

      <p className="cart-total">
        <span>Food</span>
        <span>{euro(cart.subtotalCents)}</span>
      </p>
      <p className="muted">The delivery fee is worked out from your address at checkout.</p>

      <div className="actions">
        <Link to="/checkout" className="btn btn-primary">
          Go to checkout
        </Link>
        <button type="button" className="btn btn-ghost" onClick={cart.clear}>
          Empty basket
        </button>
      </div>
    </div>
  );
}
