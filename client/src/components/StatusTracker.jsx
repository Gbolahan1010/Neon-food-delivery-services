import { ORDER_STEPS, dateTime } from '../lib/format';

/**
 * The order's journey, lit up like a neon sign: each step glows once it has happened.
 * An ordered list, because the steps really are a sequence.
 */
export default function StatusTracker({ order }) {
  if (order.status === 'cancelled') {
    return <p className="tracker-cancelled">This order was cancelled.</p>;
  }

  const reached = ORDER_STEPS.findIndex((step) => step.status === order.status);
  const timeOf = (status) => order.statusHistory?.find((h) => h.status === status)?.at;

  return (
    <ol className="tracker" aria-label="Order progress">
      {ORDER_STEPS.map((step, index) => {
        const state = index < reached ? 'done' : index === reached ? 'current' : 'todo';
        const at = timeOf(step.status);
        return (
          <li
            key={step.status}
            className={`tracker-step tracker-${state}`}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span className="tracker-light" aria-hidden="true" />
            <span className="tracker-label">{step.label}</span>
            {at && <span className="tracker-time">{dateTime(at)}</span>}
          </li>
        );
      })}
    </ol>
  );
}
