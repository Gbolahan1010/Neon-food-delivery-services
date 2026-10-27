const euroFormatter = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });

/** 1250 -> "€12.50". Money is kept in whole cents everywhere and only formatted for display. */
export const euro = (cents) => euroFormatter.format((cents || 0) / 100);

/** "12.50" typed by an owner -> 1250 cents, or NaN if it is not a valid price. */
export function toCents(text) {
  const value = Number(String(text).replace(',', '.').replace('€', '').trim());
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) : NaN;
}

export const ORDER_STEPS = [
  { status: 'placed', label: 'Order placed' },
  { status: 'preparing', label: 'Preparing' },
  { status: 'out_for_delivery', label: 'On the way' },
  { status: 'delivered', label: 'Delivered' },
];

const STATUS_LABELS = {
  placed: 'Placed',
  preparing: 'Preparing',
  out_for_delivery: 'On the way',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

export const statusLabel = (status) => STATUS_LABELS[status] || status;

export const dateTime = (iso) =>
  new Date(iso).toLocaleString('en-IE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export const capitalise = (text) => (text ? text[0].toUpperCase() + text.slice(1) : '');
