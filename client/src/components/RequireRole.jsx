import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { Loading } from './Feedback';

/**
 * Guards a page: sends visitors who are not logged in to the login page (and back afterwards),
 * and shows a message to users whose role cannot use the page.
 * This is for a smooth experience only: the API itself checks every request again.
 */
export default function RequireRole({ roles, children }) {
  const { user, checking } = useAuth();
  const location = useLocation();

  if (checking) return <Loading label="Checking your session" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname, roles }} />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="page-narrow">
        <h1>Not available for your account</h1>
        <p>This page is for {roles.join(' or ')} accounts. You are logged in as a {user.role}.</p>
      </div>
    );
  }
  return children;
}
