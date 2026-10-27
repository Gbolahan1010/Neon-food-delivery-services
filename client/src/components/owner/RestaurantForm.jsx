import { useState } from 'react';
import { api } from '../../api/client';
import Field from '../Field';
import { ErrorMessage } from '../Feedback';

const EMPTY = {
  name: '',
  description: '',
  cuisines: '',
  line1: '',
  city: 'Dublin',
  eircode: '',
  phone: '',
  imageUrl: '',
  deliveryRadiusKm: '8',
};

/** Form for an owner to add a restaurant. New restaurants wait for an admin to approve them. */
export default function RestaurantForm({ onCreated, onCancel }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const change = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const fieldErrors = error?.fieldErrors || {};

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const optional = (value) => value.trim() || undefined;
    try {
      const res = await api.post('/restaurants', {
        name: form.name.trim(),
        description: optional(form.description),
        cuisines: form.cuisines
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        address: { line1: form.line1.trim(), city: form.city.trim(), eircode: optional(form.eircode) },
        phone: optional(form.phone),
        imageUrl: optional(form.imageUrl),
        deliveryRadiusKm: Number(form.deliveryRadiusKm),
      });
      setForm(EMPTY);
      onCreated(res.data);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  return (
    <form className="card-plain" onSubmit={submit} noValidate>
      <h2>Add your restaurant</h2>
      <p className="muted">An admin checks new restaurants before customers can see them.</p>
      <Field label="Restaurant name" required value={form.name} onChange={change('name')} error={fieldErrors.name} />
      <Field label="Short description" as="textarea" rows={2} maxLength={500} value={form.description} onChange={change('description')} error={fieldErrors.description} />
      <Field label="Cuisines" hint="Separate with commas, for example: pizza, italian" value={form.cuisines} onChange={change('cuisines')} error={fieldErrors.cuisines} />
      <div className="field-row">
        <Field label="Street address" required value={form.line1} onChange={change('line1')} error={fieldErrors['address.line1']} />
        <Field label="Town or city" required value={form.city} onChange={change('city')} error={fieldErrors['address.city']} />
      </div>
      <div className="field-row">
        <Field label="Eircode (optional)" value={form.eircode} onChange={change('eircode')} />
        <Field label="Phone (optional)" type="tel" value={form.phone} onChange={change('phone')} error={fieldErrors.phone} />
      </div>
      <div className="field-row">
        <Field label="Photo link (optional)" type="url" placeholder="https://" value={form.imageUrl} onChange={change('imageUrl')} error={fieldErrors.imageUrl} />
        <Field label="Delivery distance (km)" type="number" min="1" max="30" value={form.deliveryRadiusKm} onChange={change('deliveryRadiusKm')} error={fieldErrors.deliveryRadiusKm} />
      </div>
      {error && !error.errors?.length && <ErrorMessage error={error} />}
      <div className="actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Adding...' : 'Add restaurant'}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
