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
}

function extractListingData(markdown: string, url: string): ZillowListing {
  const lines = markdown.split('\n');
  
  // Helper to find value after a pattern
  const findValue = (patterns: string[]): string => {
    for (const pattern of patterns) {
      const regex = new RegExp(pattern + '[:\\s]*([^\\n]+)', 'i');
      const match = markdown.match(regex);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return 'N/A';
  };

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

  // Extract property type
  const propertyTypes = ['Single Family', 'Condo', 'Townhouse', 'Multi-Family', 'Land', 'Apartment'];
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

  // Extract description - first substantial paragraph
  let description = 'N/A';
  const paragraphs = markdown.split(/\n\n+/);
  for (const p of paragraphs) {
    const cleaned = p.replace(/[#*\[\]]/g, '').trim();
    if (cleaned.length > 100 && !cleaned.startsWith('$') && !cleaned.match(/^\d+\s*(bed|bath)/i)) {
      description = cleaned.substring(0, 300) + (cleaned.length > 300 ? '...' : '');
      break;
    }
  }

  return {
    url,
    address,
    price,
    beds: bedsMatch ? bedsMatch[1] : 'N/A',
    baths: bathsMatch ? bathsMatch[1] : 'N/A',
    sqft: sqftMatch ? sqftMatch[1].replace(/,/g, '') : 'N/A',
    propertyType,
    yearBuilt: yearMatch ? yearMatch[1] : 'N/A',
    lotSize: lotMatch ? lotMatch[1] + (lotMatch[0].toLowerCase().includes('acre') ? ' acres' : ' sqft') : 'N/A',
    zestimate: zestimateMatch ? '$' + zestimateMatch[1] : 'N/A',
    description,
    status,
    scrapedAt: new Date().toISOString(),
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
        onlyMainContent: true,
        waitFor: 3000,
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
