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
  daysOnZillow: string;
  hoaFee: string;
  parkingSpaces: string;
  heating: string;
  cooling: string;
  neighborhood: string;
  schoolRating: string;
  imageUrl?: string;
  commuteTime?: number;
  commuteDistance?: string;
  walkScore?: number;
  bikeScore?: number;
  floodZone?: string;
  aiFeatures?: AIFeatures;
  userRating?: 'yes' | 'maybe' | 'no' | null;
  userNotes?: string;
  totalScore?: number;
}

const DESTINATION_ADDRESS = "268 Calhoun St, Charleston, SC 29425";

async function estimateCommuteTime(originAddress: string): Promise<{ time: number | null; distance: string | null }> {
  const apiKey = Deno.env.get('GEMINI_API_KEY');
  if (!apiKey) {
    console.log('No GEMINI_API_KEY configured, skipping commute estimation');
    return { time: null, distance: null };
  }

  try {
    // Use Google Maps Distance Matrix API
    const origin = encodeURIComponent(originAddress);
    const destination = encodeURIComponent(DESTINATION_ADDRESS);
    
    // Request with departure_time for traffic-aware routing (10am on a weekday for non-rush hour)
    // Using a future Tuesday at 10am
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + ((2 - futureDate.getDay() + 7) % 7) + 7); // Next Tuesday + 1 week
    futureDate.setHours(10, 0, 0, 0);
    const departureTime = Math.floor(futureDate.getTime() / 1000);
    
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&mode=driving&departure_time=${departureTime}&key=${apiKey}`;
    
    console.log('Fetching commute time for:', originAddress);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.rows?.[0]?.elements?.[0]?.status === 'OK') {
      const element = data.rows[0].elements[0];
      // Use duration_in_traffic if available (more accurate for the departure time), otherwise use duration
      const durationSeconds = element.duration_in_traffic?.value || element.duration?.value;
      const durationMinutes = Math.round(durationSeconds / 60);
      const distance = element.distance?.text || null;
      
      console.log(`Commute time: ${durationMinutes} min, Distance: ${distance}`);
      return { time: durationMinutes, distance };
    } else {
      console.error('Distance Matrix API error:', data.status, data.error_message);
      return { time: null, distance: null };
    }
  } catch (error) {
    console.error('Error estimating commute time:', error);
    return { time: null, distance: null };
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
  hoaFee: string;
  parkingSpaces: number | null;
  heating: string;
  cooling: string;
  neighborhood: string;
  schoolRating: string;
  walkScore: number | null;
  bikeScore: number | null;
  floodZone: string;
}

async function extractListingDataWithAI(markdown: string, url: string): Promise<Omit<ZillowListing, 'aiFeatures'>> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  
  if (!apiKey) {
    console.log('No LOVABLE_API_KEY, using fallback extraction');
    return extractListingDataFallback(markdown, url);
  }

  const prompt = `Extract the following real estate listing data from this Zillow page content. Be very careful and accurate.

CONTENT:
${markdown.substring(0, 14000)}

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
  "zestimate": "$1,800,000 or N/A",
  "description": "Property description text",
  "status": "For Sale, Pending, Sold, or Off Market",
  "daysOnZillow": "15 days or N/A",
  "hoaFee": "$250/mo or N/A",
  "parkingSpaces": 2,
  "heating": "Central, Forced Air, etc. or N/A",
  "cooling": "Central Air, etc. or N/A",
  "neighborhood": "Neighborhood name - look for community name, subdivision, or area name",
  "schoolRating": "8/10 or N/A",
  "walkScore": 72,
  "bikeScore": 48,
  "floodZone": "Zone X (Minimal Risk) or Zone AE (High Risk) or N/A"
}

CRITICAL EXTRACTION INSTRUCTIONS:
- For price, look for the main listing price (typically $100,000 to $10,000,000)
- Beds should be 1-10, Baths should be 1-8
- Sqft should be living area square footage (500-15,000)

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

FLOOD ZONE:
- Look for "flood", "FEMA", "flood zone", "flood factor", "flood risk" anywhere on the page
- Common values: Zone X, Zone AE, Zone A, Minimal Risk, Moderate Risk, High Risk

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
      if (priceNum > 0 && sqftNum > 0) {
        pricePerSqft = '$' + Math.round(priceNum / sqftNum);
      }

      console.log('AI extracted:', { address: parsed.address, price: priceStr, beds, baths, sqft });

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
        zestimate: parsed.zestimate || 'N/A',
        description: parsed.description?.substring(0, 800) || 'N/A',
        status: parsed.status || 'For Sale',
        scrapedAt: new Date().toISOString(),
        pricePerSqft,
        daysOnZillow: parsed.daysOnZillow || 'N/A',
        hoaFee: parsed.hoaFee || 'N/A',
        parkingSpaces: parsed.parkingSpaces ? String(parsed.parkingSpaces) : 'N/A',
        heating: parsed.heating || 'N/A',
        cooling: parsed.cooling || 'N/A',
        neighborhood: parsed.neighborhood || 'N/A',
        schoolRating: parsed.schoolRating || 'N/A',
        walkScore: (parsed.walkScore !== null && parsed.walkScore >= 0 && parsed.walkScore <= 100) ? parsed.walkScore : undefined,
        bikeScore: (parsed.bikeScore !== null && parsed.bikeScore >= 0 && parsed.bikeScore <= 100) ? parsed.bikeScore : undefined,
        floodZone: parsed.floodZone || undefined,
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
  if (priceNum > 0 && sqftNum > 0) {
    pricePerSqft = '$' + Math.round(priceNum / sqftNum);
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
    daysOnZillow,
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
        formats: ['markdown'],
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
    
    // Extract image URLs from the scraped content
    const imageUrls = extractImageUrls(markdown);
    console.log(`Found ${imageUrls.length} property images for AI analysis`);
    
    // Extract AI features with images for visual analysis
    console.log('Extracting AI features with image analysis...');
    const aiFeatures = await extractAIFeatures(listingData.description, markdown, imageUrls);

    // Estimate commute time
    console.log('Estimating commute time to MUSC...');
    const { time: commuteTime, distance: commuteDistance } = await estimateCommuteTime(listingData.address);

    const listing: ZillowListing = {
      ...listingData,
      aiFeatures,
      commuteTime: commuteTime || undefined,
      commuteDistance: commuteDistance || undefined,
    };

    console.log('Successfully extracted listing data:', listing.address, 'Commute:', commuteTime, 'min');

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
