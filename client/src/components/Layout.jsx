import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export function Wordmark() {
  return (
    <Link to="/" className="wordmark" aria-label="Neon Food Delivery, home">
      <span className="wordmark-tube">NEON</span>
      <span className="wordmark-sub">food delivery</span>
    </Link>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  async function handleLogout() {
    navigate('/'); // leave any members-only page first, so it does not bounce to the login page
    await logout();
  }

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <Wordmark />
          <nav aria-label="Main">
            <ul className="nav-list">
              <li>
                <NavLink to="/" end>
                  Restaurants
                </NavLink>
              </li>
              {user?.role === 'customer' && (
                <li>
                  <NavLink to="/orders">My orders</NavLink>
                </li>
              )}
              {user?.role === 'owner' && (
                <li>
                  <NavLink to="/owner">My restaurant</NavLink>
                </li>
              )}
              {user?.role === 'admin' && (
                <li>
                  <NavLink to="/admin">Admin</NavLink>
                </li>
              )}
              {user?.role !== 'owner' && user?.role !== 'admin' && (
                <li>
                  <NavLink to="/cart" className="nav-cart">
                    Basket
                    {count > 0 && (
                      <span className="cart-count" aria-label={`${count} items`}>
                        {count}
                      </span>
                    )}
                  </NavLink>
                </li>
              )}
              {user ? (
                <li>
                  <button type="button" className="nav-button" onClick={handleLogout}>
                    Log out
                  </button>
                </li>
              ) : (
                <li>
                  <NavLink to="/login">Log in</NavLink>
                </li>
              )}
            </ul>
          </nav>
        </div>
      </header>

      <main id="main" className="container main" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container">
          <p>
            Neon Food Delivery is a student project for Dublin Business School. Payments run in
            Stripe test mode: no real money is taken.
          </p>
        </div>
      </footer>
    </>
  );
}
