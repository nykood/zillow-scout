import type { ZillowListing, ScoringWeights } from "@/types/listing";

// Helper to parse flood zone risk level (lower number = safer)
function getFloodRiskScore(floodZone: string | undefined): number {
  if (!floodZone || floodZone === "N/A") return 0.5; // Unknown = neutral
  
  const zoneUpper = floodZone.toUpperCase();
  
  // Extract FEMA zone code
  const zoneMatch = floodZone.match(/Zone\s*([A-Z]+\d*)/i);
  const zoneCode = zoneMatch ? zoneMatch[1].toUpperCase() : null;
  
  if (zoneCode) {
    // Coastal high risk zones (V zones) - worst
    if (zoneCode === 'V' || zoneCode === 'VE') return 0;
    
    // High risk zones (A zones)
    if (['A', 'AE', 'AH', 'AO', 'AR', 'A99'].includes(zoneCode)) return 0.2;
    
    // Moderate risk (B zones, shaded X)
    if (zoneCode === 'B') return 0.6;
    
    // Low risk zones (X, C, D)
    if (['X', 'C', 'D'].includes(zoneCode)) {
      if (zoneUpper.includes('SHADED') && !zoneUpper.includes('UNSHADED')) return 0.6;
      return 1; // Best - minimal flood risk
    }
  }
  
  // Fallback text-based detection
  if (zoneUpper.includes('MINIMAL') || zoneUpper.includes('LOW RISK')) return 1;
  if (zoneUpper.includes('MINOR') || zoneUpper.includes('MODERATE')) return 0.6;
  if (zoneUpper.includes('MAJOR') || zoneUpper.includes('SEVERE') || zoneUpper.includes('EXTREME')) return 0.2;
  if (zoneUpper.includes('COASTAL')) return 0;
  
  return 0.5; // Unknown
}

export function calculateScore(
  listing: ZillowListing,
  allListings: ZillowListing[],
  weights: ScoringWeights
): number {
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

  // Normalize beds (higher is better)
  const bedCounts = allListings
    .map((l) => parseInt(l.beds) || 0)
    .filter((b) => b > 0);
  const maxBeds = Math.max(...bedCounts, 1);
  const beds = parseInt(listing.beds) || 0;
  const normalizedBeds = beds / maxBeds;

  // Normalize baths (higher is better)
  const bathCounts = allListings
    .map((l) => parseFloat(l.baths) || 0)
    .filter((b) => b > 0);
  const maxBaths = Math.max(...bathCounts, 1);
  const baths = parseFloat(listing.baths) || 0;
  const normalizedBaths = baths / maxBaths;

  // Normalize price per sqft (lower is better)
  const pricePerSqftValues = allListings
    .map((l) => l.pricePerSqftNum || (l.priceNum && l.sqftNum ? l.priceNum / l.sqftNum : 0))
    .filter((p) => p > 0);
  let normalizedPricePerSqft = 0.5;
  if (pricePerSqftValues.length > 0) {
    const maxPPS = Math.max(...pricePerSqftValues, 1);
    const minPPS = Math.min(...pricePerSqftValues, 0);
    const ppsRange = maxPPS - minPPS || 1;
    const listingPPS = listing.pricePerSqftNum || (listing.priceNum && listing.sqftNum ? listing.priceNum / listing.sqftNum : 0);
    normalizedPricePerSqft = 1 - (listingPPS - minPPS) / ppsRange;
  }

  // Normalize average school rating (higher is better, scale 1-10)
  const avgSchoolRating = calculateAvgSchoolRating(listing);
  const schoolRatings = allListings.map((l) => calculateAvgSchoolRating(l)).filter((r) => r > 0);
  let normalizedSchoolRating = 0.5;
  if (schoolRatings.length > 0 && avgSchoolRating > 0) {
    const maxSchool = Math.max(...schoolRatings, 10);
    const minSchool = Math.min(...schoolRatings, 1);
    const schoolRange = maxSchool - minSchool || 1;
    normalizedSchoolRating = (avgSchoolRating - minSchool) / schoolRange;
  }

  // Normalize commute time (lower is better)
  const commuteTimes = allListings
    .map((l) => l.commuteTime || 0)
    .filter((c) => c > 0);
  let normalizedCommute = 0.5;
  if (commuteTimes.length > 0 && listing.commuteTime) {
    const maxCommute = Math.max(...commuteTimes, 1);
    const minCommute = Math.min(...commuteTimes, 0);
    const commuteRange = maxCommute - minCommute || 1;
    normalizedCommute = 1 - (listing.commuteTime - minCommute) / commuteRange;
  }

  // Normalize garage size (higher is better)
  const garageSizes = allListings
    .map((l) => l.garageSpots || 0)
    .filter((g) => g > 0);
  let normalizedGarage = 0.5;
  if (listing.hasGarage === false) {
    normalizedGarage = 0;
  } else if (listing.garageSpots !== undefined && listing.garageSpots > 0) {
    const maxGarage = Math.max(...garageSizes, 1);
    normalizedGarage = listing.garageSpots / maxGarage;
  }

  // Flood risk score (higher is better = lower risk)
  const normalizedFloodRisk = getFloodRiskScore(listing.floodZone);

  // Calculate weighted score
  const totalWeight =
    weights.price +
    weights.size +
    weights.beds +
    weights.baths +
    weights.pricePerSqft +
    weights.avgSchoolRating +
    weights.commuteTime +
    weights.garageSize +
    weights.floodRisk;

  const score =
    (normalizedPrice * weights.price +
      normalizedSize * weights.size +
      normalizedBeds * weights.beds +
      normalizedBaths * weights.baths +
      normalizedPricePerSqft * weights.pricePerSqft +
      normalizedSchoolRating * weights.avgSchoolRating +
      normalizedCommute * weights.commuteTime +
      normalizedGarage * weights.garageSize +
      normalizedFloodRisk * weights.floodRisk) /
    totalWeight;

  return Math.round(score * 100);
}

function calculateAvgSchoolRating(listing: ZillowListing): number {
  const ratings: number[] = [];
  if (listing.elementarySchoolRating !== undefined) ratings.push(listing.elementarySchoolRating);
  if (listing.middleSchoolRating !== undefined) ratings.push(listing.middleSchoolRating);
  if (listing.highSchoolRating !== undefined) ratings.push(listing.highSchoolRating);
  
  if (ratings.length === 0) return 0;
  return ratings.reduce((a, b) => a + b, 0) / ratings.length;
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
