import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useApi } from '../hooks/useApi';
import RestaurantCard from '../components/RestaurantCard';
import { EmptyState, ErrorMessage, Loading } from '../components/Feedback';

const CUISINES = ['pizza', 'italian', 'nigerian', 'japanese', 'vegan', 'burgers'];

export default function Home() {
  const [params, setParams] = useSearchParams();
  const search = params.get('search') || '';
  const cuisine = params.get('cuisine') || '';
  const page = Number(params.get('page')) || 1;
  const [draft, setDraft] = useState(search);

  const query = new URLSearchParams({ page: String(page), limit: '9' });
  if (search) query.set('search', search);
  if (cuisine) query.set('cuisine', cuisine);
  const { data: restaurants, meta, error, loading, reload } = useApi(`/restaurants?${query}`);

  function update(next) {
    const merged = { search, cuisine, page: '1', ...next };
    setParams(Object.fromEntries(Object.entries(merged).filter(([, v]) => v && v !== '1')));
  }

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <h1 id="hero-title" className="hero-title">
          Dublin&rsquo;s independent kitchens, open late.
        </h1>
        <p className="hero-text">
          Order straight from local restaurants. Delivery is priced by distance, so nearby food
          costs less to bring to your door.
        </p>
        <form
          className="search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            update({ search: draft.trim() });
          }}
        >
          <label htmlFor="search" className="visually-hidden">
            Search restaurants or dishes
          </label>
          <input
            id="search"
            type="search"
            placeholder="Pizza, jollof, ramen..."
            value={draft}
            maxLength={100}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            Search
          </button>
        </form>
      </section>

      <section aria-labelledby="list-title">
        <div className="section-head">
          <h2 id="list-title">
            {search ? `Results for “${search}”` : 'Restaurants delivering now'}
          </h2>
          <div className="chips" role="group" aria-label="Filter by cuisine">
            {CUISINES.map((c) => (
              <button
                key={c}
                type="button"
                className="chip"
                aria-pressed={cuisine === c}
                onClick={() => update({ cuisine: cuisine === c ? '' : c })}
              >
                {c[0].toUpperCase() + c.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading && <Loading label="Finding restaurants" />}
        <ErrorMessage error={error} onRetry={reload} />

        {!loading && !error && restaurants?.length === 0 && (
          <EmptyState title="No restaurants match that">
            <p>Try another dish or cuisine, or clear the filters.</p>
            <button type="button" className="btn btn-ghost" onClick={() => setParams({})}>
              Clear filters
            </button>
          </EmptyState>
        )}

        {!loading && restaurants?.length > 0 && (
          <div className="restaurant-grid">
            {restaurants.map((r) => (
              <RestaurantCard key={r._id} restaurant={r} />
            ))}
          </div>
        )}

        {meta && meta.pages > 1 && (
          <nav className="pager" aria-label="Pages">
            <button
              type="button"
              className="btn btn-ghost"
              disabled={page <= 1}
              onClick={() => update({ page: String(page - 1) })}
            >
              Previous
            </button>
            <span>
              Page {page} of {meta.pages}
            </span>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={page >= meta.pages}
              onClick={() => update({ page: String(page + 1) })}
            >
              Next
            </button>
          </nav>
        )}
      </section>
    </>
  );
}
