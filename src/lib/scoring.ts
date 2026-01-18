import type { ZillowListing, ScoringWeights } from "@/types/listing";

export function calculateScore(
  listing: ZillowListing,
  allListings: ZillowListing[],
  weights: ScoringWeights
): number {
  if (!listing.aiFeatures) return 0;

  // Normalize price (lower is better)
  const prices = allListings.map((l) => l.priceNum).filter((p) => p > 0);
  const maxPrice = Math.max(...prices, 1);
  const minPrice = Math.min(...prices, 0);
  const priceRange = maxPrice - minPrice || 1;
  const normalizedPrice = 1 - (listing.priceNum - minPrice) / priceRange;

  // Normalize sqft (higher is better)
  const sizes = allListings.map((l) => l.sqftNum).filter((s) => s > 0);
  const maxSize = Math.max(...sizes, 1);
  const minSize = Math.min(...sizes, 0);
  const sizeRange = maxSize - minSize || 1;
  const normalizedSize = (listing.sqftNum - minSize) / sizeRange;

  // Normalize beds
  const bedCounts = allListings
    .map((l) => parseInt(l.beds) || 0)
    .filter((b) => b > 0);
  const maxBeds = Math.max(...bedCounts, 1);
  const beds = parseInt(listing.beds) || 0;
  const normalizedBeds = beds / maxBeds;

  // Normalize baths
  const bathCounts = allListings
    .map((l) => parseFloat(l.baths) || 0)
    .filter((b) => b > 0);
  const maxBaths = Math.max(...bathCounts, 1);
  const baths = parseFloat(listing.baths) || 0;
  const normalizedBaths = baths / maxBaths;

  // Normalize commute time (lower is better)
  const commuteTimes = allListings
    .map((l) => l.commuteTime || 0)
    .filter((c) => c > 0);
  let normalizedCommute = 0.5; // Default if no commute data
  if (commuteTimes.length > 0 && listing.commuteTime) {
    const maxCommute = Math.max(...commuteTimes, 1);
    const minCommute = Math.min(...commuteTimes, 0);
    const commuteRange = maxCommute - minCommute || 1;
    normalizedCommute = 1 - (listing.commuteTime - minCommute) / commuteRange;
  }

  // AI features are already 1-10, normalize to 0-1
  const ai = listing.aiFeatures;
  const features = {
    kitchenQuality: ai.kitchenQuality / 10,
    bathroomQuality: ai.bathroomQuality / 10,
    overallCondition: ai.overallCondition / 10,
    naturalLight: ai.naturalLight / 10,
    layoutFlow: ai.layoutFlow / 10,
    curbAppeal: ai.curbAppeal / 10,
    privacyLevel: ai.privacyLevel / 10,
    yardUsability: ai.yardUsability / 10,
    storageSpace: ai.storageSpace / 10,
    modernUpdates: ai.modernUpdates / 10,
  };

  // Calculate weighted score
  const totalWeight =
    weights.price +
    weights.size +
    weights.beds +
    weights.baths +
    weights.commuteTime +
    weights.kitchenQuality +
    weights.bathroomQuality +
    weights.overallCondition +
    weights.naturalLight +
    weights.layoutFlow +
    weights.curbAppeal +
    weights.privacyLevel +
    weights.yardUsability +
    weights.storageSpace +
    weights.modernUpdates;

  const score =
    (normalizedPrice * weights.price +
      normalizedSize * weights.size +
      normalizedBeds * weights.beds +
      normalizedBaths * weights.baths +
      normalizedCommute * weights.commuteTime +
      features.kitchenQuality * weights.kitchenQuality +
      features.bathroomQuality * weights.bathroomQuality +
      features.overallCondition * weights.overallCondition +
      features.naturalLight * weights.naturalLight +
      features.layoutFlow * weights.layoutFlow +
      features.curbAppeal * weights.curbAppeal +
      features.privacyLevel * weights.privacyLevel +
      features.yardUsability * weights.yardUsability +
      features.storageSpace * weights.storageSpace +
      features.modernUpdates * weights.modernUpdates) /
    totalWeight;

  return Math.round(score * 100);
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

export function getScoreBgColor(score: number): string {
  if (score >= 80) return "bg-green-500/10 border-green-500/30";
  if (score >= 60) return "bg-yellow-500/10 border-yellow-500/30";
  if (score >= 40) return "bg-orange-500/10 border-orange-500/30";
  return "bg-red-500/10 border-red-500/30";
}

export function getRatingEmoji(rating: number): string {
  if (rating >= 9) return "🌟";
  if (rating >= 7) return "✨";
  if (rating >= 5) return "👍";
  if (rating >= 3) return "😐";
  return "👎";
}
