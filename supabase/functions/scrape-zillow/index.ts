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

async function extractAIFeatures(description: string, markdown: string): Promise<AIFeatures> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  if (!apiKey) {
    console.log('No LOVABLE_API_KEY configured, using default AI features');
    return getDefaultAIFeatures();
  }

  const prompt = `Analyze this real estate listing and rate each feature from 1-10. Be objective and honest.

LISTING CONTENT:
${markdown.substring(0, 8000)}

DESCRIPTION:
${description}

Rate these features from 1-10 (1=poor, 5=average, 10=excellent):
1. Kitchen Quality - modern appliances, countertops, cabinets, layout
2. Bathroom Quality - fixtures, tile, vanities, condition
3. Overall Condition - maintenance, wear, needed repairs
4. Natural Light - windows, sun exposure, brightness
5. Layout Flow - room arrangement, open concept, functionality
6. Curb Appeal - exterior appearance, landscaping, first impression
7. Privacy Level - distance from neighbors, lot position, fencing
8. Yard Usability - flat areas, outdoor living space, garden potential
9. Storage Space - closets, garage, basement, attic
10. Modern Updates - recent renovations, smart home, energy efficiency

Respond ONLY with valid JSON in this exact format:
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
  "summary": "Brief 1-2 sentence summary of the property's best and worst features."
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
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error('AI API error:', await response.text());
      return getDefaultAIFeatures();
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
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
    console.error('Error extracting AI features:', error);
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

function extractListingData(markdown: string, url: string): Omit<ZillowListing, 'aiFeatures'> {
  // Extract price - look for $ followed by numbers
  const priceMatch = markdown.match(/\$[\d,]+(?:\.\d{2})?/);
  const price = priceMatch ? priceMatch[0] : 'N/A';
  const priceNum = price !== 'N/A' ? parseInt(price.replace(/[$,]/g, '')) : 0;

  // Extract address - usually in the first few lines or title
  let address = 'N/A';
  const addressPatterns = [
    /^#\s*(.+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Blvd|Boulevard|Ct|Court|Way|Pl|Place)[^#\n]*)/im,
    /(\d+\s+[A-Za-z\s]+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Blvd|Boulevard|Ct|Court|Way|Pl|Place)[^,\n]*,\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5})/i,
  ];
  for (const pattern of addressPatterns) {
    const match = markdown.match(pattern);
    if (match) {
      address = match[1].trim();
      break;
    }
  }
  
  // If no address found, try extracting from URL
  if (address === 'N/A') {
    const urlMatch = url.match(/\/homedetails\/([^\/]+)/);
    if (urlMatch) {
      address = urlMatch[1].replace(/-/g, ' ').replace(/_/g, ', ');
    }
  }

  // Extract beds/baths/sqft
  const bedsMatch = markdown.match(/(\d+)\s*(?:bed|beds|bedroom|bedrooms|bd)/i);
  const bathsMatch = markdown.match(/(\d+(?:\.\d+)?)\s*(?:bath|baths|bathroom|bathrooms|ba)/i);
  const sqftMatch = markdown.match(/([\d,]+)\s*(?:sq\s*ft|sqft|square\s*feet)/i);
  const sqft = sqftMatch ? sqftMatch[1].replace(/,/g, '') : 'N/A';
  const sqftNum = sqft !== 'N/A' ? parseInt(sqft) : 0;

  // Calculate price per sqft
  let pricePerSqft = 'N/A';
  if (priceNum > 0 && sqftNum > 0) {
    pricePerSqft = '$' + Math.round(priceNum / sqftNum);
  }

  // Extract property type
  const propertyTypes = ['Single Family', 'Condo', 'Townhouse', 'Multi-Family', 'Land', 'Apartment', 'Mobile', 'Manufactured'];
  let propertyType = 'Single Family';
  for (const type of propertyTypes) {
    if (markdown.toLowerCase().includes(type.toLowerCase())) {
      propertyType = type;
      break;
    }
  }

  // Extract year built
  const yearMatch = markdown.match(/(?:built|year\s*built)[:\s]*(\d{4})/i) || 
                    markdown.match(/(\d{4})\s*(?:year\s*built|construction)/i);

  // Extract lot size
  const lotMatch = markdown.match(/([\d,.]+)\s*(?:acres?|sq\s*ft\s*lot|sqft\s*lot)/i);

  // Extract Zestimate
  const zestimateMatch = markdown.match(/zestimate[:\s]*\$?([\d,]+)/i);

  // Extract status
  let status = 'For Sale';
  if (markdown.toLowerCase().includes('sold')) status = 'Sold';
  else if (markdown.toLowerCase().includes('pending')) status = 'Pending';
  else if (markdown.toLowerCase().includes('for rent')) status = 'For Rent';
  else if (markdown.toLowerCase().includes('off market')) status = 'Off Market';

  // Extract days on Zillow
  const daysMatch = markdown.match(/(\d+)\s*(?:days?)\s*(?:on\s*zillow|on\s*market)/i);
  const daysOnZillow = daysMatch ? daysMatch[1] + ' days' : 'N/A';

  // Extract HOA fee
  const hoaMatch = markdown.match(/hoa[:\s]*\$?([\d,]+)(?:\/mo)?/i) ||
                   markdown.match(/\$?([\d,]+)(?:\/mo)?\s*hoa/i);
  const hoaFee = hoaMatch ? '$' + hoaMatch[1] + '/mo' : 'N/A';

  // Extract parking
  const parkingMatch = markdown.match(/(\d+)\s*(?:car\s*)?(?:garage|parking|carport)/i) ||
                       markdown.match(/(?:garage|parking)[:\s]*(\d+)/i);
  const parkingSpaces = parkingMatch ? parkingMatch[1] : 'N/A';

  // Extract heating
  const heatingMatch = markdown.match(/heating[:\s]*([^,\n]+)/i) ||
                       markdown.match(/(forced\s*air|central|radiant|baseboard|heat\s*pump)[^\n]*/i);
  const heating = heatingMatch ? heatingMatch[1].trim().substring(0, 50) : 'N/A';

  // Extract cooling
  const coolingMatch = markdown.match(/cooling[:\s]*([^,\n]+)/i) ||
                       markdown.match(/(central\s*air|window\s*unit|evaporative|a\/c)[^\n]*/i);
  const cooling = coolingMatch ? coolingMatch[1].trim().substring(0, 50) : 'N/A';

  // Extract neighborhood
  const neighborhoodMatch = markdown.match(/(?:neighborhood|community|subdivision)[:\s]*([^,\n]+)/i);
  const neighborhood = neighborhoodMatch ? neighborhoodMatch[1].trim().substring(0, 50) : 'N/A';

  // Extract school rating
  const schoolMatch = markdown.match(/(\d+)\/10\s*(?:school|rating)/i) ||
                      markdown.match(/school[:\s]*(\d+)/i);
  const schoolRating = schoolMatch ? schoolMatch[1] + '/10' : 'N/A';

  // Extract image URL
  const imageMatch = markdown.match(/!\[.*?\]\((https?:\/\/[^\s)]+\.(?:jpg|jpeg|png|webp)[^\s)]*)\)/i);
  const imageUrl = imageMatch ? imageMatch[1] : undefined;

  // Extract description - find substantial paragraphs
  let description = 'N/A';
  const paragraphs = markdown.split(/\n\n+/);
  for (const p of paragraphs) {
    const cleaned = p.replace(/[#*\[\]]/g, '').trim();
    if (cleaned.length > 80 && !cleaned.startsWith('$') && !cleaned.match(/^\d+\s*(bed|bath)/i)) {
      description = cleaned.substring(0, 800) + (cleaned.length > 800 ? '...' : '');
      break;
    }
  }

  return {
    id: generateId(),
    url,
    address,
    price,
    priceNum,
    beds: bedsMatch ? bedsMatch[1] : 'N/A',
    baths: bathsMatch ? bathsMatch[1] : 'N/A',
    sqft,
    sqftNum,
    propertyType,
    yearBuilt: yearMatch ? yearMatch[1] : 'N/A',
    lotSize: lotMatch ? lotMatch[1] + (lotMatch[0].toLowerCase().includes('acre') ? ' acres' : ' sqft') : 'N/A',
    zestimate: zestimateMatch ? '$' + zestimateMatch[1] : 'N/A',
    description,
    status,
    scrapedAt: new Date().toISOString(),
    pricePerSqft,
    daysOnZillow,
    hoaFee,
    parkingSpaces,
    heating,
    cooling,
    neighborhood,
    schoolRating,
    imageUrl,
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

    const listingData = extractListingData(markdown, url);
    
    // Extract AI features
    console.log('Extracting AI features...');
    const aiFeatures = await extractAIFeatures(listingData.description, markdown);

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
