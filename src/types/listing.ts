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
  yearBuiltNum?: number;
  lotSize: string;
  zestimate: string;
  description: string;
  status: string;
  scrapedAt: string;
  pricePerSqft: string;
  pricePerSqftNum: number;
  daysOnZillow: string;
  daysOnMarket?: number;
  hoaFee: string;
  parkingSpaces: string;
  heating: string;
  cooling: string;
  neighborhood: string;
  schoolRating: string;
  
  // Garage info
  hasGarage?: boolean;
  garageSpots?: number;
  
  // GreatSchools ratings
  elementarySchoolRating?: number;
  middleSchoolRating?: number;
  highSchoolRating?: number;
  
  imageUrl?: string;
  
  // Commute information
  commuteTime?: number; // rush hour commute in minutes
  commuteTimeNoTraffic?: number; // non-rush hour commute in minutes
  commuteDistance?: string;
  
  // Price cut information
  priceCutAmount?: number; // e.g., 50000 for $50k cut
  priceCutPercent?: number; // e.g., 5.2 for 5.2%
  priceCutDate?: string; // short date like "1/12"
  
  // Walkability & Flood info
  walkScore?: number;
  bikeScore?: number;
  floodZone?: string;
  
  // User feedback
  userRating?: 'yes' | 'maybe' | 'no' | null;
  userNotes?: string;

  // Qualitative ratings (1-10 scale, user-provided)
  qualKitchen?: number;
  qualBathrooms?: number;
  qualMasterSuite?: number;
  qualOffice?: number;
  qualOverallVibe?: number;
  qualNeighborhoodFeel?: number;
  qualOutdoorSpace?: number;

  // Calculated score
  totalScore?: number;
}

export interface ScoringWeights {
  price: number;
  size: number;
  beds: number;
  baths: number;
  pricePerSqft: number;
  avgSchoolRating: number;
  commuteTime: number;
  garageSize: number;
  floodRisk: number;
  qualKitchen: number;
  qualBathrooms: number;
  qualMasterSuite: number;
  qualOffice: number;
  qualOverallVibe: number;
  qualNeighborhoodFeel: number;
  qualOutdoorSpace: number;
}

export const DEFAULT_WEIGHTS: ScoringWeights = {
  price: 10,
  size: 8,
  beds: 6,
  baths: 5,
  pricePerSqft: 7,
  avgSchoolRating: 8,
  commuteTime: 7,
  garageSize: 4,
  floodRisk: 6,
  qualKitchen: 5,
  qualBathrooms: 5,
  qualMasterSuite: 5,
  qualOffice: 5,
  qualOverallVibe: 5,
  qualNeighborhoodFeel: 5,
  qualOutdoorSpace: 5,
};

export const QUALITATIVE_FIELDS = [
  { key: 'qualOverallVibe' as const, label: 'Overall Vibe', weightKey: 'qualOverallVibe' as const },
  { key: 'qualKitchen' as const, label: 'Kitchen Quality', weightKey: 'qualKitchen' as const },
  { key: 'qualBathrooms' as const, label: 'Bathroom Quality', weightKey: 'qualBathrooms' as const },
  { key: 'qualMasterSuite' as const, label: 'Master Suite', weightKey: 'qualMasterSuite' as const },
  { key: 'qualOffice' as const, label: "Nico's Office Space", weightKey: 'qualOffice' as const },
  { key: 'qualNeighborhoodFeel' as const, label: 'Neighborhood Feel', weightKey: 'qualNeighborhoodFeel' as const },
  { key: 'qualOutdoorSpace' as const, label: 'Porch / Yard / Hosting', weightKey: 'qualOutdoorSpace' as const },
] as const;

export type QualitativeFieldKey = typeof QUALITATIVE_FIELDS[number]['key'];
