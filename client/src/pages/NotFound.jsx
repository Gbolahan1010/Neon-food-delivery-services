import { Link } from 'react-router';
import { EmptyState } from '../components/Feedback';

export default function NotFound() {
  return (
    <EmptyState title="This page does not exist">
      <p>The link may be old, or the address has a typo.</p>
      <Link to="/" className="btn btn-primary">
        Browse restaurants
      </Link>
    </EmptyState>
  );
}
