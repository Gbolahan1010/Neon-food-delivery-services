import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import Field from '../components/Field';
import { EmptyState, ErrorMessage, Notice } from '../components/Feedback';
import { euro } from '../lib/format';

export default function Checkout() {
  const { user } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const [address, setAddress] = useState({
    line1: user?.address?.line1 || '',
    line2: user?.address?.line2 || '',
    city: user?.address?.city || '',
    eircode: user?.address?.eircode || '',
  });
  const [notes, setNotes] = useState('');
  const [quote, setQuote] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState('');

  if (cart.count === 0) {
    return (
      <EmptyState title="Nothing to check out">
        <Link to="/" className="btn btn-primary">
          Browse restaurants
        </Link>
      </EmptyState>
    );
  }

  const change = (key) => (e) => {
    setAddress({ ...address, [key]: e.target.value });
    setQuote(null); // a new address needs a new delivery quote
  };

  const cleanAddress = () =>
    Object.fromEntries(Object.entries(address).filter(([, v]) => v.trim() !== ''));

  async function getQuote(e) {
    e.preventDefault();
    setBusy('quote');
    setError(null);
    setFieldErrors({});
    try {
      const res = await api.post('/delivery/quote', {
        restaurantId: cart.restaurant.id,
        address: cleanAddress(),
      });
      setQuote(res.data);
    } catch (err) {
      setFieldErrors(
        Object.fromEntries(
          Object.entries(err.fieldErrors || {}).map(([k, v]) => [k.replace('address.', ''), v])
        )
      );
      setError(err);
    } finally {
      setBusy('');
    }
  }

  async function placeOrder() {
    setBusy('order');
    setError(null);
    let order;
    try {
      const res = await api.post('/orders', {
        restaurantId: cart.restaurant.id,
        items: cart.items.map(({ menuItemId, quantity }) => ({ menuItemId, quantity })),
        deliveryAddress: cleanAddress(),
        notes: notes.trim() || undefined,
      });
      order = res.data;
    } catch (err) {
      setError(err);
      setBusy('');
      return;
    }

    // The order exists now, so the basket can go. Next: Stripe's payment page.
    cart.clear();
    try {
      const pay = await api.post('/payments/checkout', { orderId: order._id });
      window.location.assign(pay.data.url);
    } catch {
      navigate(`/orders/${order._id}?payment=unavailable`);
    }
  }

  const total = quote ? cart.subtotalCents + quote.deliveryFeeCents : null;

  return (
    <div className="checkout">
      <h1>Checkout</h1>
      <div className="checkout-grid">
        <form className="card-plain" onSubmit={getQuote} noValidate>
          <h2>Delivery address</h2>
          <Field label="Street address" autoComplete="address-line1" required value={address.line1} onChange={change('line1')} error={fieldErrors.line1} />
          <Field label="Apartment or building (optional)" autoComplete="address-line2" value={address.line2} onChange={change('line2')} />
          <div className="field-row">
            <Field label="Town or city" autoComplete="address-level2" required value={address.city} onChange={change('city')} error={fieldErrors.city} />
            <Field label="Eircode (optional)" autoComplete="postal-code" value={address.eircode} onChange={change('eircode')} />
          </div>
          <Field
            label="Note for the restaurant (optional)"
            as="textarea"
            rows={2}
            maxLength={300}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button type="submit" className="btn btn-ghost" disabled={busy !== ''}>
            {busy === 'quote' ? 'Checking address...' : quote ? 'Check again' : 'Check delivery fee'}
          </button>
        </form>

        <section className="order-summary" aria-labelledby="summary-title">
          <h2 id="summary-title">{cart.restaurant.name}</h2>
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
          <p className="basket-total">
            <span>Delivery{quote ? ` (${quote.distanceKm} km)` : ''}</span>
            <span>{quote ? euro(quote.deliveryFeeCents) : 'Check your address'}</span>
          </p>
          {quote && (
            <p className="basket-total basket-grand">
              <span>Total</span>
              <span>{euro(total)}</span>
            </p>
          )}

          <div aria-live="polite">
            {quote && !quote.withinRange && (
              <Notice tone="warning">
                That address is {quote.distanceKm} km away. {cart.restaurant.name} delivers up to{' '}
                {quote.maxDistanceKm} km.
              </Notice>
            )}
            <ErrorMessage error={error} />
          </div>

          <button
            type="button"
            className="btn btn-primary btn-block"
            disabled={!quote || !quote.withinRange || busy !== ''}
            onClick={placeOrder}
          >
            {busy === 'order' ? 'Opening secure payment...' : total ? `Pay ${euro(total)}` : 'Pay'}
          </button>
          <p className="muted small">
            You will pay on Stripe&rsquo;s secure page. Test card: 4242 4242 4242 4242, any future
            date, any CVC.
          </p>
        </section>
      </div>
    </div>
  );
}
