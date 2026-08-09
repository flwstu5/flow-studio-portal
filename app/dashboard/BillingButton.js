import { manageBilling } from "./actions";

export default function BillingButton() {
  return (
    <form action={manageBilling}>
      <button
        type="submit"
        className="text-xs font-medium text-neutral-600 border border-neutral-300 rounded px-3 py-1.5"
      >
        Manage billing
      </button>
    </form>
  );
}
