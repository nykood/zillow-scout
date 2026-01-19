const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIFeatures {
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
  summary: string;
}

interface ZillowListing {
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
  pricePerSqftNum: number;
  daysOnZillow: string;
  daysOnMarket?: number;
  hoaFee: string;
  parkingSpaces: string;
  heating: string;
  cooling: string;
  neighborhood: string;
  schoolRating: string;
  hasGarage?: boolean;
  garageSpots?: number;
  elementarySchoolRating?: number;
  middleSchoolRating?: number;
  highSchoolRating?: number;
  imageUrl?: string;
  commuteTime?: number; // rush hour
  commuteTimeNoTraffic?: number; // non-rush hour
  commuteDistance?: string;
  priceCutAmount?: number;
  priceCutPercent?: number;
  priceCutDate?: string;
  walkScore?: number;
  bikeScore?: number;
  floodZone?: string;
  aiFeatures?: AIFeatures;
  userRating?: 'yes' | 'maybe' | 'no' | null;
  userNotes?: string;
  totalScore?: number;
}

const DESTINATION_ADDRESS = "171 Ashley Ave, Charleston, SC 29425, USA";

async function estimateCommuteTime(originAddress: string): Promise<{ time: number | null; timeNoTraffic: number | null; distance: string | null }> {
  const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!apiKey) {
    console.log('No GOOGLE_MAPS_API_KEY configured, skipping commute estimation');
    return { time: null, timeNoTraffic: null, distance: null };
  }

  try {
    console.log('Fetching commute time for:', originAddress, 'to', DESTINATION_ADDRESS);
    
    // Calculate next Monday for consistent traffic estimates
    const now = new Date();
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
    
    // Morning commute: 7am departure (for table display)
    const morningDeparture = new Date(now);
    morningDeparture.setDate(now.getDate() + daysUntilMonday);
    morningDeparture.setHours(7, 0, 0, 0);
    
    // Evening commute: 5pm departure (for details - worst case)
    const eveningDeparture = new Date(now);
    eveningDeparture.setDate(now.getDate() + daysUntilMonday);
    eveningDeparture.setHours(17, 0, 0, 0);
    
    // Call 1: Morning commute at 7am - traffic-aware (for table)
    const morningResponse = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
      },
      body: JSON.stringify({
        origin: { address: originAddress },
        destination: { address: DESTINATION_ADDRESS },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
        departureTime: morningDeparture.toISOString(),
        computeAlternativeRoutes: false,
        // No trafficModel = uses live/historical traffic data
      }),
    });

    const morningData = await morningResponse.json();
    
    if (!morningResponse.ok) {
      console.error('Routes API error (7am):', morningResponse.status, JSON.stringify(morningData));
      return { time: null, timeNoTraffic: null, distance: null };
    }
    
    let morningMinutes: number | null = null;
    let distance: string | null = null;
    
    if (morningData.routes && morningData.routes.length > 0) {
      const route = morningData.routes[0];
      const durationStr = route.duration || '0s';
      const durationSeconds = parseInt(durationStr.replace('s', '')) || 0;
      morningMinutes = Math.round(durationSeconds / 60);
      
      const distanceMeters = route.distanceMeters || 0;
      const distanceMiles = (distanceMeters / 1609.344).toFixed(1);
      distance = `${distanceMiles} mi`;
      
      console.log('Morning (7am) response:', JSON.stringify({ duration: route.duration, distanceMeters: route.distanceMeters }));
    }
    
    // Call 2: Evening commute at 5pm with PESSIMISTIC - worst case (for details)
    const eveningResponse = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration',
      },
      body: JSON.stringify({
        origin: { address: originAddress },
        destination: { address: DESTINATION_ADDRESS },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
        departureTime: eveningDeparture.toISOString(),
        computeAlternativeRoutes: false,
        trafficModel: 'PESSIMISTIC', // Worst-case evening rush hour estimate
      }),
    });

    const eveningData = await eveningResponse.json();
    
    if (!eveningResponse.ok) {
      console.error('Routes API error (5pm PESSIMISTIC):', eveningResponse.status, JSON.stringify(eveningData));
      // Return morning data even if evening fails
      return { time: morningMinutes, timeNoTraffic: morningMinutes, distance };
    }
    
    let eveningMinutes: number | null = null;
    
    if (eveningData.routes && eveningData.routes.length > 0) {
      const route = eveningData.routes[0];
      const durationStr = route.duration || '0s';
      const durationSeconds = parseInt(durationStr.replace('s', '')) || 0;
      eveningMinutes = Math.round(durationSeconds / 60);
      
      console.log('Evening (5pm PESSIMISTIC) response:', JSON.stringify({ duration: route.duration }));
    }
    
    console.log(`Morning commute (7am): ${morningMinutes} min, Evening worst-case (5pm): ${eveningMinutes} min, Distance: ${distance}`);
    return { time: morningMinutes, timeNoTraffic: eveningMinutes, distance };
  } catch (error) {
    console.error('Error estimating commute time:', error);
    return { time: null, timeNoTraffic: null, distance: null };
  }
}

function extractImageUrls(markdown: string): string[] {
  const imageUrls: string[] = [];
  
  // Match markdown image syntax ![alt](url)
  const markdownImages = markdown.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g);
  for (const match of markdownImages) {
    const url = match[1];
    if (url && (url.includes('zillow') || url.includes('zillowstatic') || url.startsWith('http'))) {
      imageUrls.push(url);
    }
  }
  
  // Match raw image URLs in the content
  const rawUrls = markdown.matchAll(/https?:\/\/[^\s\)]+\.(?:jpg|jpeg|png|webp)(?:\?[^\s\)]*)?/gi);
  for (const match of rawUrls) {
    if (!imageUrls.includes(match[0])) {
      imageUrls.push(match[0]);
    }
  }
  
  // Filter for Zillow-specific photo URLs and deduplicate
  const zillowPhotos = imageUrls.filter(url => 
    url.includes('photos.zillowstatic.com') || 
    url.includes('zillowstatic.com') ||
    url.includes('zillow.com')
  );
  
  // Return unique URLs, prefer Zillow photos, limit to first 10 for API efficiency
  const uniqueUrls = [...new Set(zillowPhotos.length > 0 ? zillowPhotos : imageUrls)];
  return uniqueUrls.slice(0, 10);
}

async function extractAIFeatures(description: string, markdown: string, imageUrls: string[]): Promise<AIFeatures> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    console.log('No LOVABLE_API_KEY configured, using default AI features');
    return getDefaultAIFeatures();
  }

  console.log(`Analyzing property with ${imageUrls.length} images`);

  // Build the message content with images for multimodal analysis
  const messageContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
  
  // Add the text prompt first
  const textPrompt = `You are a real estate expert analyzing property photos and listing details. Based on the images and description provided, rate each feature from 1-10. Be objective, critical, and base your ratings on what you can actually SEE in the photos.

PROPERTY DESCRIPTION:
${description}

LISTING DETAILS:
${markdown.substring(0, 4000)}

Carefully examine each photo and rate these features from 1-10 (1=poor, 5=average, 10=excellent):

1. Kitchen Quality - Look at appliances (stainless steel=higher), countertops (granite/quartz=higher), cabinets (condition, style), layout efficiency
2. Bathroom Quality - Check fixtures, tile work, vanity quality, overall cleanliness and modernity
3. Overall Condition - Visible wear, maintenance level, needed repairs (cracks, stains, dated features)
4. Natural Light - Window count/size, room brightness, sun exposure visible in photos
5. Layout Flow - Room arrangement, open vs closed concept, how spaces connect
6. Curb Appeal - Exterior appearance, landscaping, driveway, front entrance appeal
7. Privacy Level - Lot position, distance from neighbors, fencing, tree coverage
8. Yard Usability - Flat areas for activities, patio/deck, garden space, outdoor living potential
9. Storage Space - Visible closets, garage size, basement/attic potential
10. Modern Updates - Recent renovations visible, smart home features, energy-efficient windows/appliances

IMPORTANT: Each property is UNIQUE. Base ratings ONLY on what you observe in these specific photos. Do NOT give the same scores to different properties.

Respond ONLY with valid JSON:
{
  "kitchenQuality": 7,
  "bathroomQuality": 6,
  "overallCondition": 7,
  "naturalLight": 8,
  "layoutFlow": 6,
  "curbAppeal": 7,
  "privacyLevel": 5,
  "yardUsability": 6,
  "storageSpace": 5,
  "modernUpdates": 6,
  "summary": "Specific 2-3 sentence summary mentioning what you observed - best features and concerns."
}`;

  messageContent.push({ type: 'text', text: textPrompt });

  // Add images for visual analysis (Gemini supports image URLs directly)
  for (const imageUrl of imageUrls.slice(0, 8)) { // Limit to 8 images for API limits
    messageContent.push({
      type: 'image_url',
      image_url: { url: imageUrl }
    });
  }

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash', // Multimodal model that supports images
        messages: [
          { role: 'user', content: messageContent }
        ],
        temperature: 0.4, // Slightly higher for more varied responses
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      // Fall back to text-only analysis
      return extractAIFeaturesTextOnly(description, markdown);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI analysis response received');
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        kitchenQuality: clamp(parsed.kitchenQuality || 5, 1, 10),
        bathroomQuality: clamp(parsed.bathroomQuality || 5, 1, 10),
        overallCondition: clamp(parsed.overallCondition || 5, 1, 10),
        naturalLight: clamp(parsed.naturalLight || 5, 1, 10),
        layoutFlow: clamp(parsed.layoutFlow || 5, 1, 10),
        curbAppeal: clamp(parsed.curbAppeal || 5, 1, 10),
        privacyLevel: clamp(parsed.privacyLevel || 5, 1, 10),
        yardUsability: clamp(parsed.yardUsability || 5, 1, 10),
        storageSpace: clamp(parsed.storageSpace || 5, 1, 10),
        modernUpdates: clamp(parsed.modernUpdates || 5, 1, 10),
        summary: parsed.summary || 'Analysis complete.',
      };
    }
  } catch (error) {
    console.error('Error extracting AI features with images:', error);
    // Fall back to text-only analysis
    return extractAIFeaturesTextOnly(description, markdown);
  }

  return getDefaultAIFeatures();
}

async function extractAIFeaturesTextOnly(description: string, markdown: string): Promise<AIFeatures> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    return getDefaultAIFeatures();
  }

  console.log('Falling back to text-only AI analysis');

  const prompt = `Analyze this real estate listing and rate each feature from 1-10. Be objective and base ratings on the description.

LISTING CONTENT:
${markdown.substring(0, 8000)}

DESCRIPTION:
${description}

Rate these features from 1-10 (1=poor, 5=average, 10=excellent):
1. Kitchen Quality - appliances, countertops, cabinets, layout
2. Bathroom Quality - fixtures, tile, vanities, condition
3. Overall Condition - maintenance, wear, needed repairs
4. Natural Light - windows, sun exposure, brightness
5. Layout Flow - room arrangement, open concept, functionality
6. Curb Appeal - exterior appearance, landscaping
7. Privacy Level - lot position, fencing, neighbors
8. Yard Usability - outdoor space, patio, garden potential
9. Storage Space - closets, garage, basement, attic
10. Modern Updates - renovations, smart home, energy efficiency

Respond ONLY with valid JSON:
{
  "kitchenQuality": 7,
  "bathroomQuality": 6,
  "overallCondition": 7,
  "naturalLight": 8,
  "layoutFlow": 6,
  "curbAppeal": 7,
  "privacyLevel": 5,
  "yardUsability": 6,
  "storageSpace": 5,
  "modernUpdates": 6,
  "summary": "Brief 2 sentence summary of best and worst features."
}`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      return getDefaultAIFeatures();
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        kitchenQuality: clamp(parsed.kitchenQuality || 5, 1, 10),
        bathroomQuality: clamp(parsed.bathroomQuality || 5, 1, 10),
        overallCondition: clamp(parsed.overallCondition || 5, 1, 10),
        naturalLight: clamp(parsed.naturalLight || 5, 1, 10),
        layoutFlow: clamp(parsed.layoutFlow || 5, 1, 10),
        curbAppeal: clamp(parsed.curbAppeal || 5, 1, 10),
        privacyLevel: clamp(parsed.privacyLevel || 5, 1, 10),
        yardUsability: clamp(parsed.yardUsability || 5, 1, 10),
        storageSpace: clamp(parsed.storageSpace || 5, 1, 10),
        modernUpdates: clamp(parsed.modernUpdates || 5, 1, 10),
        summary: parsed.summary || 'Analysis based on listing text.',
      };
    }
  } catch (error) {
    console.error('Text-only AI analysis error:', error);
  }

  return getDefaultAIFeatures();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getDefaultAIFeatures(): AIFeatures {
  return {
    kitchenQuality: 5,
    bathroomQuality: 5,
    overallCondition: 5,
    naturalLight: 5,
    layoutFlow: 5,
    curbAppeal: 5,
    privacyLevel: 5,
    yardUsability: 5,
    storageSpace: 5,
    modernUpdates: 5,
    summary: 'AI analysis not available. Using default ratings.',
  };
}

function generateId(): string {
  return 'listing_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

interface ExtractedData {
  address: string;
  price: string;
  beds: number;
  baths: number;
  sqft: number;
  propertyType: string;
  yearBuilt: number | null;
  lotSize: string;
  zestimate: string;
  description: string;
  status: string;
  daysOnZillow: string;
  daysOnMarket: number | null;
  hoaFee: string;
  parkingSpaces: number | null;
  hasGarage: boolean | null;
  garageSpots: number | null;
  heating: string;
  cooling: string;
  neighborhood: string;
  schoolRating: string;
  elementarySchoolRating: number | null;
  middleSchoolRating: number | null;
  highSchoolRating: number | null;
  walkScore: number | null;
  bikeScore: number | null;
  floodZone: string;
  priceCutAmount: number | null;
  priceCutPercent: number | null;
  priceCutDate: string | null;
}

async function extractListingDataWithAI(markdown: string, url: string): Promise<Omit<ZillowListing, 'aiFeatures'>> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  
  if (!apiKey) {
    console.log('No LOVABLE_API_KEY, using fallback extraction');
    return extractListingDataFallback(markdown, url);
  }

  // Search for school-related content in the markdown
  const schoolSectionMatch = markdown.match(/(?:Schools|Nearby schools|GreatSchools)[\s\S]{0,3000}/i);
  const schoolContent = schoolSectionMatch ? schoolSectionMatch[0] : '';
  
  console.log('School content found:', schoolContent.substring(0, 500));
  
  // Search for "Getting around" section with Walk Score and Bike Score
  const gettingAroundMatch = markdown.match(/(?:Getting around|Walk Score|Transportation|Walkability)[\s\S]{0,2000}/i);
  const gettingAroundContent = gettingAroundMatch ? gettingAroundMatch[0] : '';
  
  console.log('Getting around content found:', gettingAroundContent.substring(0, 500));
  
  // Search for "Climate risks" section with Flood information
  const climateRisksMatch = markdown.match(/(?:Climate risks|Flood Factor|Flood risk|FEMA|flood zone)[\s\S]{0,2000}/i);
  const climateRisksContent = climateRisksMatch ? climateRisksMatch[0] : '';
  
  console.log('Climate risks content found:', climateRisksContent.substring(0, 500));
  
  // Search for Price history / Price cut section
  const priceHistoryMatch = markdown.match(/(?:Price history|Price cut|Price reduced|Price drop|\$[\d,]+\s*\([-−]\s*\$[\d,]+\))[\s\S]{0,2000}/i);
  const priceHistoryContent = priceHistoryMatch ? priceHistoryMatch[0] : '';
  
  console.log('Price history content found:', priceHistoryContent.substring(0, 500));
  
  // Search for Parking/Garage section - look for multiple patterns
  const parkingMatch = markdown.match(/(?:Parking|Garage|Interior features|Facts and features)[\s\S]{0,3000}/i);
  const parkingContent = parkingMatch ? parkingMatch[0] : '';
  
  console.log('Parking/Garage content found:', parkingContent.substring(0, 800));
  
  // Search for Zestimate section - look for multiple patterns where Zillow shows estimated value
  const zestimateMatch = markdown.match(/(?:Zestimate|Estimated\s*value|Home\s*value|Market\s*value|Estimated\s*market)[\s\S]{0,1500}/i);
  const zestimateContent = zestimateMatch ? zestimateMatch[0] : '';
  
  console.log('Zestimate content found:', zestimateContent.substring(0, 500));
  
  const prompt = `Extract the following real estate listing data from this Zillow page content. Be very careful and accurate.

MAIN CONTENT:
${markdown.substring(0, 10000)}

SCHOOL SECTION (if found):
${schoolContent}

GETTING AROUND / WALK SCORE SECTION (if found):
${gettingAroundContent}

CLIMATE RISKS / FLOOD SECTION (if found):
${climateRisksContent}

PRICE HISTORY / PRICE CUT SECTION (if found):
${priceHistoryContent}

PARKING/GARAGE SECTION (if found):
${parkingContent}

ZESTIMATE / HOME VALUE SECTION (if found):
${zestimateContent}

Extract this information and respond ONLY with valid JSON:
{
  "address": "Full street address including city, state, and ZIP",
  "price": "Listed sale price (e.g., '$1,750,000')",
  "beds": 3,
  "baths": 2.5,
  "sqft": 2500,
  "propertyType": "Single Family, Condo, Townhouse, etc.",
  "yearBuilt": 1985,
  "lotSize": "0.25 acres or 10,890 sqft",
  "zestimate": "$1,800,000 or N/A - EXTRACT THE ZESTIMATE VALUE from anywhere on the page",
  "description": "FULL property description text - capture the entire description, do not truncate or shorten it",
  "status": "For Sale, Pending, Active Contingent, Sold, Off Market, etc.",
  "daysOnZillow": "15 days or N/A",
  "daysOnMarket": 15,
  "hoaFee": "$250/mo or N/A",
  "parkingSpaces": 2,
  "hasGarage": true,
  "garageSpots": 2,
  "heating": "Central, Forced Air, etc. or N/A",
  "cooling": "Central Air, etc. or N/A",
  "neighborhood": "Neighborhood name - look for community name, subdivision, or area name",
  "schoolRating": "8/10 or N/A",
  "elementarySchoolRating": 8,
  "middleSchoolRating": 7,
  "highSchoolRating": 9,
  "walkScore": 72,
  "bikeScore": 48,
  "floodZone": "Zone X (Minimal Risk) or Zone AE (High Risk) or N/A",
  "priceCutAmount": 50000,
  "priceCutPercent": 5.2,
  "priceCutDate": "1/12"
}

CRITICAL EXTRACTION INSTRUCTIONS:
- For price, look for the main listing price (typically $100,000 to $10,000,000)
- Beds should be 1-10, Baths should be 1-8
- Sqft should be living area square footage (500-15,000)

STATUS - VERY IMPORTANT:
- Look for the exact listing status displayed on the page
- Common statuses: "For Sale", "Pending", "Active Contingent", "Contingent", "Sold", "Off Market"
- Extract the exact status text shown (e.g., "Active Contingent" not just "Pending")

DAYS ON MARKET - VERY IMPORTANT:
- Look for text like "X days on Zillow" or "Time on Zillow: X days"
- Extract just the number for daysOnMarket (e.g., 15)
- Also keep the original text format in daysOnZillow (e.g., "15 days")

GARAGE INFORMATION - VERY IMPORTANT (see PARKING/GARAGE SECTION above):
- FIRST look in the PARKING/GARAGE SECTION provided above for garage information
- Search for explicit patterns like: "Garage spaces: 2", "2-car garage", "2 car garage", "Total spaces: 2", "Attached 2 Car Garage"
- Look for "Attached garage" or "Detached garage" with a number before or after
- hasGarage should be true if any garage is mentioned, false if "No garage" or similar
- garageSpots is the NUMBER of car spaces - extract the actual digit(s)
- Examples: "2-car attached garage" = 2, "3 car garage" = 3, "Garage spaces: 2" = 2, "2 Car Attached Garage" = 2
- Do NOT default to 1 - only use 1 if explicitly stated "1-car garage" or "1 car garage" or "Garage spaces: 1"
- If garage is mentioned with no specific number, look for nearby numbers in the parking section
- Return null for garageSpots if no garage exists or number cannot be determined

GREATSCHOOLS RATINGS - VERY IMPORTANT:
- Look for a "Schools" or "Nearby schools" section on the Zillow page
- Zillow shows GreatSchools ratings for Elementary, Middle, and High Schools nearby
- Each school has a rating from 1-10 (GreatSchools rating)
- Look for patterns like "Elementary School" with a number rating (1-10)
- Look for patterns like "Middle School" with a number rating (1-10)
- Look for patterns like "High School" with a number rating (1-10)
- Extract the HIGHEST rated school for each level if multiple are shown
- These are numbers from 1-10. Return null if not found.

WALK SCORE & BIKE SCORE - VERY IMPORTANT:
- Look for a section called "Getting around" on the page
- Walk Score appears as "Walk Score®" followed by a number like "72 / 100" with a label like "Very Walkable"
- Bike Score appears as "Bike Score®" followed by a number like "48 / 100" with a label like "Somewhat Bikeable"
- These are numbers from 0-100. Extract ONLY the number (e.g., 72, not "72 / 100")
- If you see patterns like "Walk Score® 72 / 100" extract 72
- If you see patterns like "Bike Score® 48 / 100" extract 48

NEIGHBORHOOD:
- Look for community name, subdivision name, or area name
- Often appears near the address or in a "Neighborhood" or "Community" section

FLOOD ZONE - VERY IMPORTANT:
- Look for a section called "Climate risks" on the Zillow page
- Zillow shows "Flood Factor" with a risk level (Minimal, Minor, Moderate, Major, Severe, Extreme)
- Also look for FEMA flood zone designations like "Zone X", "Zone AE", "Zone A", "Zone VE"
- Extract the flood risk description or zone (e.g., "Minimal" or "Zone X" or "Moderate - This property has a 26% chance of flooding")
- If you find Flood Factor, extract the risk level (Minimal, Minor, Moderate, Major, Severe, Extreme)
- Return the most specific flood information found

PRICE CUT / PRICE REDUCTION - VERY IMPORTANT:
- Look for any mention of "Price cut", "Price reduced", "Price drop", or a price history showing a reduction
- Zillow often shows this as "Price cut: -$50,000 (Jan 12)" or similar
- Extract priceCutAmount as the dollar amount reduced (e.g., 50000 for $50,000)
- Extract priceCutPercent as the percentage cut if shown (e.g., 5.2 for 5.2%)
- Extract priceCutDate as a short date format like "1/12" for January 12
- If multiple price cuts exist, use the most recent one
- Return null for all three fields if no price cut is found

ZESTIMATE - VERY IMPORTANT:
- The Zestimate is Zillow's estimated market value for the property
- Look for "Zestimate", "Estimated value", "Home value", or "Market value" anywhere on the page
- The Zestimate is typically displayed near the listing price or in a "Home value" section
- Extract the dollar amount (e.g., "$1,800,000")
- This may appear as "Zestimate®: $XXX,XXX" or just near text saying "estimated value"
- Look for patterns like "$1,234,567" near words like "estimate", "value", or "worth"
- Return "N/A" only if truly not found anywhere on the page

If you cannot find a value, use null for numbers or "N/A" for strings.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error('AI extraction error:', await response.text());
      return extractListingDataFallback(markdown, url);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed: ExtractedData = JSON.parse(jsonMatch[0]);
      
      // Parse price
      const priceStr = parsed.price || 'N/A';
      const priceNum = priceStr !== 'N/A' ? parseInt(priceStr.replace(/[$,]/g, '')) || 0 : 0;
      
      // Validate extracted values
      const beds = parsed.beds !== null && parsed.beds >= 0 && parsed.beds <= 50 ? String(parsed.beds) : 'N/A';
      const baths = parsed.baths !== null && parsed.baths >= 0 && parsed.baths <= 50 ? String(parsed.baths) : 'N/A';
      const sqft = parsed.sqft !== null && parsed.sqft > 0 && parsed.sqft < 100000 ? String(parsed.sqft) : 'N/A';
      const sqftNum = sqft !== 'N/A' ? parseInt(sqft) : 0;
      
      // Calculate price per sqft
      let pricePerSqft = 'N/A';
      let pricePerSqftNum = 0;
      if (priceNum > 0 && sqftNum > 0) {
        pricePerSqftNum = Math.round(priceNum / sqftNum);
        pricePerSqft = '$' + pricePerSqftNum;
      }
      
      // Parse days on market as number
      let daysOnMarket: number | undefined = undefined;
      const daysStr = parsed.daysOnZillow || '';
      const daysNumMatch = daysStr.match(/(\d+)/);
      if (daysNumMatch) {
        daysOnMarket = parseInt(daysNumMatch[1]);
      } else if (parsed.daysOnMarket !== null && parsed.daysOnMarket >= 0) {
        daysOnMarket = parsed.daysOnMarket;
      }

      console.log('AI extracted:', { address: parsed.address, price: priceStr, beds, baths, sqft, elementarySchoolRating: parsed.elementarySchoolRating, middleSchoolRating: parsed.middleSchoolRating, highSchoolRating: parsed.highSchoolRating, walkScore: parsed.walkScore, bikeScore: parsed.bikeScore, hasGarage: parsed.hasGarage, garageSpots: parsed.garageSpots, daysOnMarket, priceCutAmount: parsed.priceCutAmount, priceCutPercent: parsed.priceCutPercent, priceCutDate: parsed.priceCutDate });
      
      // Fallback: try to extract price cut from markdown if AI didn't find it
      let priceCutAmount = parsed.priceCutAmount;
      let priceCutPercent = parsed.priceCutPercent;
      let priceCutDate = parsed.priceCutDate;
      
      if (!priceCutAmount) {
        // Look for patterns like "Price cut: -$50,000" or "$50K price drop" or "(-$25,000)"
        const priceCutPatterns = [
          /price\s*(?:cut|drop|reduced?)[\s:]*[-−]?\s*\$?([\d,]+)/i,
          /\(-?\$?([\d,]+)\s*(?:price\s*)?(?:cut|drop|reduction)\)/i,
          /[-−]\s*\$?([\d,]+)\s*\(/i,
        ];
        
        for (const pattern of priceCutPatterns) {
          const match = markdown.match(pattern);
          if (match) {
            const amount = parseInt(match[1].replace(/,/g, ''));
            if (amount > 0 && amount < 10000000) {
              priceCutAmount = amount;
              console.log('Fallback price cut extraction found:', amount);
              break;
            }
          }
        }
      }

      // Fallback: try to extract Zestimate from markdown if AI didn't find it
      let zestimate = parsed.zestimate || 'N/A';
      
      if (zestimate === 'N/A' || !zestimate) {
        // Look for Zestimate patterns - Zillow shows it in various formats
        const zestimatePatterns = [
          /Zestimate[®\s:]*\$\s*([\d,]+)/i,
          /estimated\s*(?:home\s*)?value[:\s]*\$\s*([\d,]+)/i,
          /home\s*value[:\s]*\$\s*([\d,]+)/i,
          /market\s*value[:\s]*\$\s*([\d,]+)/i,
          /(?:worth|valued?\s*at)[:\s]*\$\s*([\d,]+)/i,
          // Look for a price-like number near "Zestimate" keyword
          /Zestimate[\s\S]{0,50}\$\s*([\d,]+)/i,
          // Look for price near "estimate" words
          /\$\s*([\d,]+)[\s\S]{0,30}(?:estimated|estimate|Zestimate)/i,
        ];
        
        for (const pattern of zestimatePatterns) {
          const match = markdown.match(pattern);
          if (match) {
            const amount = parseInt(match[1].replace(/,/g, ''));
            // Zestimate should be a reasonable home price (between $10k and $50M)
            if (amount >= 10000 && amount <= 50000000) {
              zestimate = '$' + amount.toLocaleString();
              console.log('Fallback Zestimate extraction found:', zestimate);
              break;
            }
          }
        }
      }

      console.log('Final extracted data:', { zestimate, priceCutAmount });

      return {
        id: generateId(),
        url,
        address: parsed.address || extractAddressFromUrl(url),
        price: priceStr,
        priceNum,
        beds,
        baths,
        sqft,
        sqftNum,
        propertyType: parsed.propertyType || 'Single Family',
        yearBuilt: parsed.yearBuilt ? String(parsed.yearBuilt) : 'N/A',
        lotSize: parsed.lotSize || 'N/A',
        zestimate,
        description: parsed.description || 'N/A',
        status: parsed.status || 'For Sale',
        scrapedAt: new Date().toISOString(),
        pricePerSqft,
        pricePerSqftNum,
        daysOnZillow: parsed.daysOnZillow || 'N/A',
        daysOnMarket,
        hoaFee: parsed.hoaFee || 'N/A',
        parkingSpaces: parsed.parkingSpaces ? String(parsed.parkingSpaces) : 'N/A',
        hasGarage: parsed.hasGarage !== null ? parsed.hasGarage : undefined,
        garageSpots: (parsed.garageSpots !== null && parsed.garageSpots >= 0) ? parsed.garageSpots : undefined,
        heating: parsed.heating || 'N/A',
        cooling: parsed.cooling || 'N/A',
        neighborhood: parsed.neighborhood || 'N/A',
        schoolRating: parsed.schoolRating || 'N/A',
        elementarySchoolRating: (parsed.elementarySchoolRating !== null && parsed.elementarySchoolRating >= 1 && parsed.elementarySchoolRating <= 10) ? parsed.elementarySchoolRating : undefined,
        middleSchoolRating: (parsed.middleSchoolRating !== null && parsed.middleSchoolRating >= 1 && parsed.middleSchoolRating <= 10) ? parsed.middleSchoolRating : undefined,
        highSchoolRating: (parsed.highSchoolRating !== null && parsed.highSchoolRating >= 1 && parsed.highSchoolRating <= 10) ? parsed.highSchoolRating : undefined,
        walkScore: (parsed.walkScore !== null && parsed.walkScore >= 0 && parsed.walkScore <= 100) ? parsed.walkScore : undefined,
        bikeScore: (parsed.bikeScore !== null && parsed.bikeScore >= 0 && parsed.bikeScore <= 100) ? parsed.bikeScore : undefined,
        floodZone: parsed.floodZone || undefined,
        priceCutAmount: (priceCutAmount !== null && priceCutAmount !== undefined && priceCutAmount > 0) ? priceCutAmount : undefined,
        priceCutPercent: (priceCutPercent !== null && priceCutPercent !== undefined && priceCutPercent > 0) ? priceCutPercent : undefined,
        priceCutDate: priceCutDate || undefined,
        userRating: null,
        userNotes: '',
      };
    }
  } catch (error) {
    console.error('Error in AI extraction:', error);
  }

  return extractListingDataFallback(markdown, url);
}

function extractAddressFromUrl(url: string): string {
  const urlMatch = url.match(/\/homedetails\/([^\/]+)/);
  if (urlMatch) {
    return urlMatch[1].replace(/-/g, ' ').replace(/_zpid.*/, '').replace(/_/g, ', ');
  }
  return 'N/A';
}

function extractListingDataFallback(markdown: string, url: string): Omit<ZillowListing, 'aiFeatures'> {
  // Improved price extraction - look for larger prices first (typical listing prices are $100k+)
  let price = 'N/A';
  let priceNum = 0;
  
  // Look for prices in typical listing format (hundreds of thousands to millions)
  const largePriceMatches = markdown.matchAll(/\$\s*([\d,]+(?:\.\d{2})?)\s*(?:K|M)?/gi);
  for (const match of largePriceMatches) {
    const numStr = match[1].replace(/,/g, '');
    const num = parseFloat(numStr);
    // Likely listing price is between $50,000 and $50,000,000
    if (num >= 50000 && num <= 50000000 && num > priceNum) {
      priceNum = num;
      price = '$' + num.toLocaleString();
    }
  }

  // Extract address
  let address = extractAddressFromUrl(url);
  
  // Try to find address in markdown
  const addressPatterns = [
    /(\d+\s+[A-Za-z0-9\s]+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Blvd|Boulevard|Ct|Court|Way|Pl|Place)[^,\n]*,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5})/i,
  ];
  for (const pattern of addressPatterns) {
    const match = markdown.match(pattern);
    if (match) {
      address = match[1].trim();
      break;
    }
  }

  // Extract beds - look for pattern like "4 bd" or "4 beds" with reasonable numbers
  let beds = 'N/A';
  const bedsPatterns = [
    /\b(\d{1,2})\s*(?:bd|bed|beds|bedroom|bedrooms)\b/i,
  ];
  for (const pattern of bedsPatterns) {
    const match = markdown.match(pattern);
    if (match) {
      const num = parseInt(match[1]);
      if (num >= 0 && num <= 20) {
        beds = String(num);
        break;
      }
    }
  }

  // Extract baths
  let baths = 'N/A';
  const bathsPatterns = [
    /\b(\d{1,2}(?:\.\d)?)\s*(?:ba|bath|baths|bathroom|bathrooms)\b/i,
  ];
  for (const pattern of bathsPatterns) {
    const match = markdown.match(pattern);
    if (match) {
      const num = parseFloat(match[1]);
      if (num >= 0 && num <= 20) {
        baths = String(num);
        break;
      }
    }
  }

  // Extract sqft - look for reasonable values
  let sqft = 'N/A';
  let sqftNum = 0;
  const sqftPatterns = [
    /\b([\d,]+)\s*(?:sq\s*ft|sqft|square\s*feet)\b/i,
  ];
  for (const pattern of sqftPatterns) {
    const match = markdown.match(pattern);
    if (match) {
      const num = parseInt(match[1].replace(/,/g, ''));
      if (num >= 100 && num <= 50000) {
        sqft = String(num);
        sqftNum = num;
        break;
      }
    }
  }

  // Calculate price per sqft
  let pricePerSqft = 'N/A';
  let pricePerSqftNum = 0;
  if (priceNum > 0 && sqftNum > 0) {
    pricePerSqftNum = Math.round(priceNum / sqftNum);
    pricePerSqft = '$' + pricePerSqftNum;
  }

  // Extract property type
  const propertyTypes = ['Single Family', 'Condo', 'Townhouse', 'Multi-Family', 'Land', 'Apartment'];
  let propertyType = 'Single Family';
  for (const type of propertyTypes) {
    if (markdown.toLowerCase().includes(type.toLowerCase())) {
      propertyType = type;
      break;
    }
  }

  // Extract year built
  const yearMatch = markdown.match(/(?:built|year\s*built)[:\s]*(\d{4})/i);

  // Extract status
  let status = 'For Sale';
  if (markdown.toLowerCase().includes('sold')) status = 'Sold';
  else if (markdown.toLowerCase().includes('pending')) status = 'Pending';

  // Extract days on Zillow
  const daysMatch = markdown.match(/(\d+)\s*days?\s*(?:on\s*zillow|on\s*market)/i);
  const daysOnZillow = daysMatch ? daysMatch[1] + ' days' : 'N/A';
  const daysOnMarket = daysMatch ? parseInt(daysMatch[1]) : undefined;

  return {
    id: generateId(),
    url,
    address,
    price,
    priceNum,
    beds,
    baths,
    sqft,
    sqftNum,
    propertyType,
    yearBuilt: yearMatch ? yearMatch[1] : 'N/A',
    lotSize: 'N/A',
    zestimate: 'N/A',
    description: 'N/A',
    status,
    scrapedAt: new Date().toISOString(),
    pricePerSqft,
    pricePerSqftNum,
    daysOnZillow,
    daysOnMarket,
    hoaFee: 'N/A',
    parkingSpaces: 'N/A',
    heating: 'N/A',
    cooling: 'N/A',
    neighborhood: 'N/A',
    schoolRating: 'N/A',
    userRating: null,
    userNotes: '',
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate it's a Zillow URL
    if (!url.includes('zillow.com')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Please provide a valid Zillow URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      console.error('FIRECRAWL_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Scraping service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Scraping Zillow URL:', url);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url.trim(),
        formats: ['markdown', 'screenshot'],
        onlyMainContent: false,
        waitFor: 5000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl API error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || 'Failed to scrape the page' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const markdown = data.data?.markdown || data.markdown || '';
    
    if (!markdown) {
      return new Response(
        JSON.stringify({ success: false, error: 'No content found on the page' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const listingData = await extractListingDataWithAI(markdown, url);
    
    // Extract image URLs from the scraped content for thumbnail
    const imageUrls = extractImageUrls(markdown);
    console.log(`Found ${imageUrls.length} property images`);
    
    // Get the main property thumbnail image (first image or screenshot)
    let thumbnailUrl: string | undefined = undefined;
    if (imageUrls.length > 0) {
      thumbnailUrl = imageUrls[0];
    } else if (data.data?.screenshot) {
      // Use screenshot as fallback if no images found
      thumbnailUrl = data.data.screenshot;
    }
    
    // Skip AI features extraction - no longer needed
    const aiFeatures = undefined;

    // Estimate commute time (rush hour and non-rush hour)
    console.log('Estimating commute time to MUSC...');
    const { time: commuteTime, timeNoTraffic: commuteTimeNoTraffic, distance: commuteDistance } = await estimateCommuteTime(listingData.address);

    const listing: ZillowListing = {
      ...listingData,
      aiFeatures,
      imageUrl: thumbnailUrl,
      commuteTime: commuteTime || undefined,
      commuteTimeNoTraffic: commuteTimeNoTraffic || undefined,
      commuteDistance: commuteDistance || undefined,
    };

    console.log('Successfully extracted listing data:', listing.address, 'Rush hour commute:', commuteTime, 'min', 'No traffic:', commuteTimeNoTraffic, 'min', 'Image:', !!thumbnailUrl);

    return new Response(
      JSON.stringify({ success: true, data: listing }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping Zillow:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
