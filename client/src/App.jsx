import { Route, Routes } from 'react-router';
import Layout from './components/Layout';
import RequireRole from './components/RequireRole';
import Home from './pages/Home';
import Restaurant from './pages/Restaurant';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Orders from './pages/Orders';
import Order from './pages/Order';
import Login from './pages/Login';
import Register from './pages/Register';
import OwnerDashboard from './pages/OwnerDashboard';
import Admin from './pages/Admin';
import NotFound from './pages/NotFound';

/** Every page of the site. RequireRole only shapes the experience: the API checks every request. */
export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="restaurants/:id" element={<Restaurant />} />
        <Route path="cart" element={<Cart />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route
          path="checkout"
          element={
            <RequireRole roles={['customer']}>
              <Checkout />
            </RequireRole>
          }
        />
        <Route
          path="orders"
          element={
            <RequireRole roles={['customer']}>
              <Orders />
            </RequireRole>
          }
        />
        <Route
          path="orders/:id"
          element={
            <RequireRole>
              <Order />
            </RequireRole>
          }
        />
        <Route
          path="owner"
          element={
            <RequireRole roles={['owner']}>
              <OwnerDashboard />
            </RequireRole>
          }
        />
        <Route
          path="admin"
          element={
            <RequireRole roles={['admin']}>
              <Admin />
            </RequireRole>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
