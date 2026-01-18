const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ZillowListing {
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

function extractListingData(markdown: string, url: string): ZillowListing {
  // Extract price - look for $ followed by numbers
  const priceMatch = markdown.match(/\$[\d,]+(?:\.\d{2})?/);
  const price = priceMatch ? priceMatch[0] : 'N/A';

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

  // Calculate price per sqft
  let pricePerSqft = 'N/A';
  if (price !== 'N/A' && sqft !== 'N/A') {
    const priceNum = parseInt(price.replace(/[$,]/g, ''));
    const sqftNum = parseInt(sqft);
    if (!isNaN(priceNum) && !isNaN(sqftNum) && sqftNum > 0) {
      pricePerSqft = '$' + Math.round(priceNum / sqftNum);
    }
  }

  // Extract property type
  const propertyTypes = ['Single Family', 'Condo', 'Townhouse', 'Multi-Family', 'Land', 'Apartment', 'Mobile', 'Manufactured'];
  let propertyType = 'N/A';
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

  // Extract appliances
  const appliancesMatch = markdown.match(/appliances[:\s]*([^.\n]+)/i);
  const appliances = appliancesMatch ? appliancesMatch[1].trim().substring(0, 100) : 'N/A';

  // Extract features
  const features: string[] = [];
  const featureKeywords = [
    'pool', 'spa', 'fireplace', 'hardwood', 'granite', 'stainless', 'updated', 'renovated',
    'view', 'waterfront', 'basement', 'attic', 'deck', 'patio', 'fenced', 'solar',
    'smart home', 'wine cellar', 'home office', 'guest house', 'tennis court'
  ];
  for (const keyword of featureKeywords) {
    if (markdown.toLowerCase().includes(keyword)) {
      features.push(keyword.charAt(0).toUpperCase() + keyword.slice(1));
    }
  }

  // Extract neighborhood
  const neighborhoodMatch = markdown.match(/(?:neighborhood|community|subdivision)[:\s]*([^,\n]+)/i);
  const neighborhood = neighborhoodMatch ? neighborhoodMatch[1].trim().substring(0, 50) : 'N/A';

  // Extract school district
  const schoolMatch = markdown.match(/(?:school\s*district|schools?)[:\s]*([^,\n]+)/i);
  const schoolDistrict = schoolMatch ? schoolMatch[1].trim().substring(0, 50) : 'N/A';

  // Extract tax assessment
  const taxMatch = markdown.match(/(?:tax|assessment|property\s*tax)[:\s]*\$?([\d,]+)/i);
  const taxAssessment = taxMatch ? '$' + taxMatch[1] : 'N/A';

  // Extract monthly payment estimate
  const monthlyMatch = markdown.match(/(?:est\.?\s*)?(?:monthly|mo\.?)\s*(?:payment)?[:\s]*\$?([\d,]+)/i) ||
                       markdown.match(/\$?([\d,]+)\s*\/\s*mo/i);
  const monthlyPaymentEstimate = monthlyMatch ? '$' + monthlyMatch[1] + '/mo' : 'N/A';

  // Extract description - find substantial paragraphs
  let description = 'N/A';
  const paragraphs = markdown.split(/\n\n+/);
  for (const p of paragraphs) {
    const cleaned = p.replace(/[#*\[\]]/g, '').trim();
    if (cleaned.length > 80 && !cleaned.startsWith('$') && !cleaned.match(/^\d+\s*(bed|bath)/i)) {
      description = cleaned.substring(0, 500) + (cleaned.length > 500 ? '...' : '');
      break;
    }
  }

  return {
    url,
    address,
    price,
    beds: bedsMatch ? bedsMatch[1] : 'N/A',
    baths: bathsMatch ? bathsMatch[1] : 'N/A',
    sqft,
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
    appliances,
    features,
    neighborhood,
    schoolDistrict,
    taxAssessment,
    monthlyPaymentEstimate,
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

    const listing = extractListingData(markdown, url);

    console.log('Successfully extracted listing data:', listing.address);

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
