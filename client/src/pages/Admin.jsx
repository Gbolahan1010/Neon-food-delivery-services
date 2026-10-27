import { useState } from 'react';
import { api } from '../api/client';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { ErrorMessage, Loading, StatusBadge } from '../components/Feedback';
import { capitalise, dateTime } from '../lib/format';

function RestaurantQueue() {
  const [filter, setFilter] = useState('false');
  const { data, error, loading, reload, setData } = useApi(`/admin/restaurants?approved=${filter}&limit=50`);
  const [actionError, setActionError] = useState(null);

  async function setApproval(restaurant, isApproved) {
    setActionError(null);
    try {
      await api.patch(`/admin/restaurants/${restaurant._id}/approval`, { isApproved });
      setData(data.filter((r) => r._id !== restaurant._id)); // it moves to the other list
    } catch (err) {
      setActionError(err);
    }
  }

  return (
    <section className="owner-section" aria-labelledby="queue-title">
      <div className="section-head">
        <h2 id="queue-title">Restaurants</h2>
        <div className="chips" role="group" aria-label="Which restaurants">
          <button type="button" className="chip" aria-pressed={filter === 'false'} onClick={() => setFilter('false')}>
            Waiting for approval
          </button>
          <button type="button" className="chip" aria-pressed={filter === 'true'} onClick={() => setFilter('true')}>
            Listed
          </button>
        </div>
      </div>
      {loading && <Loading label="Loading restaurants" />}
      <ErrorMessage error={error} onRetry={reload} />
      <ErrorMessage error={actionError} />
      {data?.length === 0 && (
        <p className="muted">{filter === 'false' ? 'Nothing waiting for approval.' : 'No listed restaurants.'}</p>
      )}
      {data?.length > 0 && (
        <ul className="manage-list">
          {data.map((r) => (
            <li key={r._id}>
              <span className="manage-main">
                <strong>{r.name}</strong>
                <span className="muted">
                  {r.cuisines.map(capitalise).join(', ')}. Owner: {r.owner?.name} ({r.owner?.email}).
                  Added {dateTime(r.createdAt)}.
                </span>
              </span>
              <span className="manage-actions">
                {filter === 'false' ? (
                  <button type="button" className="btn btn-small btn-primary" onClick={() => setApproval(r, true)}>
                    Approve
                  </button>
                ) : (
                  <button type="button" className="btn btn-small btn-ghost" onClick={() => setApproval(r, false)}>
                    Hide from customers
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function UserList() {
  const { user: me } = useAuth();
  const [role, setRole] = useState('');
  const { data, error, loading, reload, setData } = useApi(`/admin/users?limit=50${role ? `&role=${role}` : ''}`);
  const [actionError, setActionError] = useState(null);

  async function setActive(user, isActive) {
    setActionError(null);
    try {
      const res = await api.patch(`/admin/users/${user._id}/status`, { isActive });
      setData(data.map((u) => (u._id === user._id ? res.data : u)));
    } catch (err) {
      setActionError(err);
    }
  }

  return (
    <section className="owner-section" aria-labelledby="users-title">
      <div className="section-head">
        <h2 id="users-title">Accounts</h2>
        <div className="chips" role="group" aria-label="Filter accounts">
          {[
            ['', 'Everyone'],
            ['customer', 'Customers'],
            ['owner', 'Owners'],
            ['admin', 'Admins'],
          ].map(([value, label]) => (
            <button key={label} type="button" className="chip" aria-pressed={role === value} onClick={() => setRole(value)}>
              {label}
            </button>
          ))}
        </div>
      </div>
      {loading && <Loading label="Loading accounts" />}
      <ErrorMessage error={error} onRetry={reload} />
      <ErrorMessage error={actionError} />
      {data?.length > 0 && (
        <ul className="manage-list">
          {data.map((u) => (
            <li key={u._id} className={u.isActive ? '' : 'is-off'}>
              <span className="manage-main">
                <strong>{u.name}</strong>
                <span className="muted">
                  {u.email}. {capitalise(u.role)}.
                </span>
              </span>
              <span className="manage-actions">
                {!u.isActive && <StatusBadge status="cancelled">Suspended</StatusBadge>}
                {u._id !== me._id &&
                  (u.isActive ? (
                    <button type="button" className="btn btn-small btn-ghost" onClick={() => setActive(u, false)}>
                      Suspend
                    </button>
                  ) : (
                    <button type="button" className="btn btn-small btn-ghost" onClick={() => setActive(u, true)}>
                      Reactivate
                    </button>
                  ))}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function Admin() {
  return (
    <div className="owner-page">
      <h1>Admin</h1>
      <div className="owner-grid">
        <RestaurantQueue />
        <UserList />
      </div>
    </div>
  );
}
