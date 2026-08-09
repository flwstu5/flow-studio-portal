import { TIER_PLANS, nextTier } from "./tierPlans";

export default function PlanUpgradeCard({ tier, flyersUsed, limit }) {
  const next = nextTier(tier);
  if (!next) return null;

  const nextPlan = TIER_PLANS[next];
  const currentPlan = TIER_PLANS[(tier ?? "").toLowerCase()];
  const atLimit = typeof limit === "number" && flyersUsed >= limit;

  return (
    <div
      className={`border rounded p-4 flex items-center justify-between gap-4 flex-wrap ${
        atLimit ? "border-[var(--brand-color)] bg-[var(--brand-tint)]" : "border-neutral-200"
      }`}
    >
      <div>
        <p className="text-sm font-medium">
          {atLimit
            ? `You've used all ${limit} flyers this month`
            : `On ${currentPlan?.name ?? "your plan"} — ${nextPlan.name} gets you more`}
        </p>
        <p className="text-xs text-neutral-500 mt-0.5">
          {nextPlan.name} includes {nextPlan.flyersPerMonth} flyers/month
          {atLimit ? " — upgrade to keep the requests coming this month." : "."}
        </p>
      </div>
      <a
        href={nextPlan.checkoutUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs font-medium text-white bg-[var(--brand-color)] rounded px-3 py-1.5 flex-shrink-0"
      >
        Upgrade to {nextPlan.name}
      </a>
    </div>
  );
}
