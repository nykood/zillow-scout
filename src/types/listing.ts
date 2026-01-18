export interface AIFeatures {
  kitchenQuality: number; // 1-10
  bathroomQuality: number; // 1-10
  overallCondition: number; // 1-10
  naturalLight: number; // 1-10
  layoutFlow: number; // 1-10
  curbAppeal: number; // 1-10
  privacyLevel: number; // 1-10
  yardUsability: number; // 1-10
  storageSpace: number; // 1-10
  modernUpdates: number; // 1-10
  summary: string;
}

export interface ZillowListing {
  id: string;
  url: string;
  address: string;
  price: string;
  priceNum: number;
  beds: string;
  baths: string;
  sqft: string;
  sqftNum: number;
  propertyType: string;
  yearBuilt: string;
  lotSize: string;
  zestimate: string;
  description: string;
  status: string;
  scrapedAt: string;
  pricePerSqft: string;
  daysOnZillow: string;
  hoaFee: string;
  parkingSpaces: string;
  heating: string;
  cooling: string;
  neighborhood: string;
  schoolRating: string;
  imageUrl?: string;
  
  // AI-extracted features
  aiFeatures?: AIFeatures;
  
  // User feedback
  userRating?: 'yes' | 'maybe' | 'no' | null;
  userNotes?: string;
  
  // Calculated score
  totalScore?: number;
}

export interface ScoringWeights {
  price: number;
  size: number;
  beds: number;
  baths: number;
  kitchenQuality: number;
  bathroomQuality: number;
  overallCondition: number;
  naturalLight: number;
  layoutFlow: number;
  curbAppeal: number;
  privacyLevel: number;
  yardUsability: number;
  storageSpace: number;
  modernUpdates: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  price: 10,
  size: 8,
  beds: 6,
  baths: 5,
  kitchenQuality: 9,
  bathroomQuality: 7,
  overallCondition: 8,
  naturalLight: 6,
  layoutFlow: 5,
  curbAppeal: 4,
  privacyLevel: 5,
  yardUsability: 4,
  storageSpace: 3,
  modernUpdates: 6,
};
