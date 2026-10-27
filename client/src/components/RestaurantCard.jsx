import { Link } from 'react-router';
import { capitalise } from '../lib/format';

export default function RestaurantCard({ restaurant }) {
  return (
    <article className="restaurant">
      <Link to={`/restaurants/${restaurant._id}`} className="restaurant-link">
        <div className="restaurant-photo">
          {restaurant.imageUrl ? (
            <img src={restaurant.imageUrl} alt="" loading="lazy" />
          ) : (
            <span aria-hidden="true">{restaurant.name[0]}</span>
          )}
          {!restaurant.isOpen && <span className="restaurant-closed">Closed now</span>}
        </div>
        <h3 className="restaurant-name">{restaurant.name}</h3>
      </Link>
      <p className="restaurant-meta">
        {restaurant.cuisines.map(capitalise).join(', ')}
        {restaurant.address?.city && <span className="muted"> in {restaurant.address.city}</span>}
      </p>
    </article>
  );
}
