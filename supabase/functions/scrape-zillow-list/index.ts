const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    console.log('Scraping Zillow saved list URL:', url);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url.trim(),
        formats: ['markdown', 'links'],
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
    const links = data.data?.links || data.links || [];
    
    if (!markdown && links.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No content found on the page' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract Zillow property URLs from the page
    const propertyUrls: string[] = [];
    
    // Pattern for Zillow homedetails URLs
    const homedetailsPattern = /https?:\/\/(?:www\.)?zillow\.com\/homedetails\/[^\/\s"'\)]+\/\d+_zpid\/?/gi;
    
    // Extract from links array
    for (const link of links) {
      if (typeof link === 'string' && link.match(homedetailsPattern)) {
        const cleanUrl = link.split('?')[0]; // Remove query params
        if (!propertyUrls.includes(cleanUrl)) {
          propertyUrls.push(cleanUrl);
        }
      }
    }
    
    // Also extract from markdown content
    const markdownMatches = markdown.matchAll(homedetailsPattern);
    for (const match of markdownMatches) {
      const cleanUrl = match[0].split('?')[0];
      if (!propertyUrls.includes(cleanUrl)) {
        propertyUrls.push(cleanUrl);
      }
    }

    console.log(`Found ${propertyUrls.length} property URLs in the saved list`);

    return new Response(
      JSON.stringify({ success: true, urls: propertyUrls }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scraping Zillow list:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to scrape';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
