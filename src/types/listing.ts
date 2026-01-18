export interface ZillowListing {
  url: string;
  address: string;
  price: string;
  beds: string;
  baths: string;
  sqft: string;
  propertyType: string;
  yearBuilt: string;
  lotSize: string;
  zestimate: string;
  description: string;
  status: string;
  scrapedAt: string;
  // Extended fields
  pricePerSqft: string;
  daysOnZillow: string;
  hoaFee: string;
  parkingSpaces: string;
  heating: string;
  cooling: string;
  appliances: string;
  features: string[];
  neighborhood: string;
  schoolDistrict: string;
  taxAssessment: string;
  monthlyPaymentEstimate: string;
}
