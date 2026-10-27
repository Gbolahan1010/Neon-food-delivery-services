import { useState } from 'react';
import { ApiError, api } from '../../api/client';
import { useApi } from '../../hooks/useApi';
import Field from '../Field';
import { ErrorMessage, Loading } from '../Feedback';
import { capitalise, euro, toCents } from '../../lib/format';

const DIETARY = ['vegan', 'vegetarian', 'gluten-free', 'halal', 'spicy'];
const EMPTY = { name: '', price: '', category: '', description: '', dietary: [] };

/** The owner's menu: add dishes, mark them sold out, or remove them. */
export default function MenuManager({ restaurantId }) {
  const { data: menu, error, loading, reload, setData } = useApi(`/restaurants/${restaurantId}/menu`);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState(null);
  const [rowError, setRowError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const change = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const toggleTag = (tag) =>
    setForm({
      ...form,
      dietary: form.dietary.includes(tag) ? form.dietary.filter((t) => t !== tag) : [...form.dietary, tag],
    });

  const priceCents = toCents(form.price);
  const priceError = form.price && Number.isNaN(priceCents) ? 'Enter a price like 12.50' : null;
  const fieldErrors = formError?.fieldErrors || {};

  async function addDish(e) {
    e.preventDefault();
    if (Number.isNaN(priceCents) || form.price === '') {
      setFormError(new ApiError('Check the price', 400, [{ field: 'priceCents', message: 'Enter a price like 12.50' }]));
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const res = await api.post(`/restaurants/${restaurantId}/menu`, {
        name: form.name.trim(),
        priceCents,
        category: form.category.trim() || undefined,
        description: form.description.trim() || undefined,
        dietary: form.dietary,
      });
      setData([...(menu || []), res.data]);
      setForm(EMPTY);
    } catch (err) {
      setFormError(err);
    } finally {
      setBusy(false);
    }
  }

  async function toggleAvailable(dish) {
    setRowError(null);
    try {
      const res = await api.put(`/menu/${dish._id}`, { isAvailable: !dish.isAvailable });
      setData(menu.map((d) => (d._id === dish._id ? res.data : d)));
    } catch (err) {
      setRowError(err);
    }
  }

  async function remove(dish) {
    setRowError(null);
    try {
      await api.delete(`/menu/${dish._id}`);
      setData(menu.filter((d) => d._id !== dish._id));
      setConfirmDelete(null);
    } catch (err) {
      setRowError(err);
    }
  }

  return (
    <section className="owner-section" aria-labelledby="menu-title">
      <h2 id="menu-title">Menu</h2>
      {loading && <Loading label="Loading the menu" />}
      <ErrorMessage error={error} onRetry={reload} />
      <ErrorMessage error={rowError} />

      {menu?.length === 0 && <p className="muted">No dishes yet. Add your first one below.</p>}
      {menu?.length > 0 && (
        <ul className="manage-list">
          {menu.map((dish) => (
            <li key={dish._id} className={dish.isAvailable ? '' : 'is-off'}>
              <span className="manage-main">
                <strong>{dish.name}</strong>
                <span className="muted">
                  {dish.category}, {euro(dish.priceCents)}
                  {dish.isAvailable ? '' : ', sold out'}
                </span>
              </span>
              <span className="manage-actions">
                <button type="button" className="btn btn-small btn-ghost" onClick={() => toggleAvailable(dish)}>
                  {dish.isAvailable ? 'Mark sold out' : 'Back on sale'}
                </button>
                {confirmDelete === dish._id ? (
                  <button type="button" className="btn btn-small btn-danger" onClick={() => remove(dish)}>
                    Confirm delete
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-small btn-ghost"
                    onClick={() => setConfirmDelete(dish._id)}
                    aria-label={`Delete ${dish.name}`}
                  >
                    Delete
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      <form className="card-plain add-dish" onSubmit={addDish} noValidate>
        <h3>Add a dish</h3>
        <div className="field-row">
          <Field label="Dish name" required value={form.name} onChange={change('name')} error={fieldErrors.name} />
          <Field label="Price (€)" inputMode="decimal" placeholder="12.50" required value={form.price} onChange={change('price')} error={priceError || fieldErrors.priceCents} />
        </div>
        <div className="field-row">
          <Field label="Category" placeholder="Mains" value={form.category} onChange={change('category')} error={fieldErrors.category} />
          <Field label="Description (optional)" value={form.description} onChange={change('description')} error={fieldErrors.description} />
        </div>
        <fieldset className="tag-choice">
          <legend>Dietary tags</legend>
          {DIETARY.map((tag) => (
            <label key={tag}>
              <input type="checkbox" checked={form.dietary.includes(tag)} onChange={() => toggleTag(tag)} />
              {capitalise(tag)}
            </label>
          ))}
        </fieldset>
        {formError && !formError.errors?.length && <ErrorMessage error={formError} />}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Adding...' : 'Add dish'}
        </button>
      </form>
    </section>
  );
}
