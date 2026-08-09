// Flyer subscription tiers — mirrors the pricing section on
// flowstudiogrfx.com. Kept in sync manually since the marketing site and
// portal are separate apps that don't share code.
export const TIER_PLANS = {
  starter: {
    name: "Starter",
    flyersPerMonth: 2,
    price: 70,
    checkoutUrl: "https://buy.stripe.com/9B6cN40NN0CSg1Q16c9sk00",
  },
  growth: {
    name: "Growth",
    flyersPerMonth: 4,
    price: 150,
    checkoutUrl: "https://buy.stripe.com/9B68wObsrbhwcPE5ms9sk01",
  },
  premium: {
    name: "Premium",
    flyersPerMonth: 8,
    price: 275,
    checkoutUrl: "https://buy.stripe.com/3cIfZg2VV1GWg1Q0289sk02",
  },
};

const TIER_ORDER = ["starter", "growth", "premium"];

export function planLimit(tier) {
  return TIER_PLANS[(tier ?? "").toLowerCase()]?.flyersPerMonth ?? null;
}

export function nextTier(currentTier) {
  const idx = TIER_ORDER.indexOf((currentTier ?? "").toLowerCase());
  if (idx === -1 || idx === TIER_ORDER.length - 1) return null;
  return TIER_ORDER[idx + 1];
}
