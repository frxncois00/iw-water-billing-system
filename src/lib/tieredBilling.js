export function tierBreakdown(usage, tiers) {
  return [...tiers].sort((a, b) => Number(a.min_m3) - Number(b.min_m3)).map((tier) => {
    const min = Number(tier.min_m3)
    const max = tier.max_m3 == null ? usage : Number(tier.max_m3)
    const quantity = Math.max(0, Math.min(usage, max) - min)
    const amount = tier.fixed_charge == null ? Math.round(quantity * Number(tier.rate_per_m3) * 100) / 100 : Number(tier.fixed_charge)
    return { label: tier.fixed_charge == null ? `${min + 1}–${tier.max_m3 ?? 'above'} m³` : 'Minimum charge (0–10 m³)', quantity, rate: tier.rate_per_m3, amount }
  }).filter((row) => row.amount > 0)
}
