const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function extractPriceWithAI(markdown: string): Promise<{ price: string; priceNum: number } | null> {
  const apiKey = Deno.env.get('LOVABLE_API_KEY');
  
  if (!apiKey) {
    console.log('No LOVABLE_API_KEY, using fallback extraction');
    return extractPriceFallback(markdown);
  }

  const prompt = `Extract ONLY the listing sale price from this Zillow page content. Look for the main listing price (typically in hundreds of thousands or millions of dollars).

CONTENT:
${markdown.substring(0, 6000)}

Respond ONLY with valid JSON:
{
  "price": "$1,750,000",
  "priceNum": 1750000
}

IMPORTANT:
- Look for the PRIMARY listing price, not monthly payments or other amounts
- The price should typically be between $50,000 and $50,000,000
- If you can't find a valid price, return null for both fields`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite', // Use lite model for speed
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      console.error('AI extraction error:', await response.text());
      return extractPriceFallback(markdown);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.price && parsed.priceNum && parsed.priceNum >= 50000 && parsed.priceNum <= 50000000) {
        return { price: parsed.price, priceNum: parsed.priceNum };
      }
    }
  } catch (error) {
    console.error('Error in AI price extraction:', error);
  }

  return extractPriceFallback(markdown);
}

function extractPriceFallback(markdown: string): { price: string; priceNum: number } | null {
  // Look for prices in typical listing format
  const largePriceMatches = markdown.matchAll(/\$\s*([\d,]+(?:\.\d{2})?)/gi);
  let bestPrice = 0;
  
  for (const match of largePriceMatches) {
    const numStr = match[1].replace(/,/g, '');
    const num = parseFloat(numStr);
    // Likely listing price is between $50,000 and $50,000,000
    if (num >= 50000 && num <= 50000000 && num > bestPrice) {
      bestPrice = num;
    }
  }

  if (bestPrice > 0) {
    return {
      price: '$' + bestPrice.toLocaleString(),
      priceNum: bestPrice,
    };
  }

  return null;
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

    if (!url.includes('zillow.com')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Please provide a valid Zillow URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Scraping service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Checking price for:', url);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: url.trim(),
        formats: ['markdown'],
        onlyMainContent: true, // Only main content for faster scrape
        waitFor: 3000, // Shorter wait time
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

    const priceData = await extractPriceWithAI(markdown);

    if (!priceData) {
      return new Response(
        JSON.stringify({ success: false, error: 'Could not extract price' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Extracted price:', priceData.price);

    return new Response(
      JSON.stringify({ success: true, data: priceData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error checking price:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to check price';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
