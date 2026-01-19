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

    console.log('Scraping Zillow list URL:', url);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url.trim(),
        formats: ['markdown', 'links', 'html'],
        onlyMainContent: false,
        waitFor: 8000,
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
    const html = data.data?.html || data.html || '';
    const links = data.data?.links || data.links || [];
    
    console.log('Markdown length:', markdown.length);
    console.log('HTML length:', html.length);
    console.log('Links count:', links.length);
    
    // Log sample of content for debugging
    if (markdown.length > 0) {
      console.log('Markdown sample:', markdown.substring(0, 500));
    }

    // Extract Zillow property URLs from all sources
    const propertyUrls: Set<string> = new Set();
    
    // Multiple patterns for Zillow property URLs
    const patterns = [
      // Standard homedetails URLs
      /https?:\/\/(?:www\.)?zillow\.com\/homedetails\/[^\s"'\)\]>]+/gi,
      // zpid pattern in any URL
      /https?:\/\/(?:www\.)?zillow\.com\/[^\s"'\)\]>]*\d+_zpid[^\s"'\)\]>]*/gi,
      // b/ URLs (alternate format)
      /https?:\/\/(?:www\.)?zillow\.com\/b\/[^\s"'\)\]>]+/gi,
    ];
    
    const allContent = markdown + ' ' + html + ' ' + links.join(' ');
    
    for (const pattern of patterns) {
      const matches = allContent.matchAll(pattern);
      for (const match of matches) {
        let cleanUrl = match[0];
        // Remove trailing punctuation and query params
        cleanUrl = cleanUrl.replace(/[\]\)"'>]+$/, '');
        cleanUrl = cleanUrl.split('?')[0];
        cleanUrl = cleanUrl.split('#')[0];
        // Ensure URL ends with / or zpid
        if (cleanUrl.includes('_zpid') || cleanUrl.includes('/homedetails/')) {
          propertyUrls.add(cleanUrl);
        }
      }
    }
    
    // Also check links array directly
    for (const link of links) {
      if (typeof link === 'string') {
        if (link.includes('/homedetails/') || link.includes('_zpid')) {
          let cleanUrl = link.split('?')[0].split('#')[0];
          propertyUrls.add(cleanUrl);
        }
      }
    }

    const urlArray = Array.from(propertyUrls);
    console.log(`Found ${urlArray.length} property URLs in the list`);
    
    if (urlArray.length > 0) {
      console.log('Sample URLs:', urlArray.slice(0, 3));
    }

    // If no URLs found, provide helpful error message
    if (urlArray.length === 0) {
      // Check if this looks like a login page or requires auth
      const lowerContent = allContent.toLowerCase();
      if (lowerContent.includes('sign in') || lowerContent.includes('log in') || lowerContent.includes('create account')) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'This page requires login. Please try a public Zillow search URL instead (e.g., search results page).' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No property listings found on this page. Try using a Zillow search results URL.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, urls: urlArray }),
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
