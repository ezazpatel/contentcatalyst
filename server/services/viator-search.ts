import { VIATOR_BASE_URL } from './viator-api';

interface ViatorSearchResult {
  productCode: string;
  title: string;
  description: string;
  rating: number;
  reviewCount: number;
  thumbnailUrl: string;
  webURL: string; // Added webURL to the interface
}

interface ViatorSearchResponse {
  products: ViatorSearchResult[];
  totalCount: number;
}

export async function searchViatorProducts(keyword: string, limit: number = 10): Promise<ViatorSearchResult[]> {
  if (!process.env.VIATOR_API_KEY) {
    console.log('No Viator API key configured');
    return [];
  }

  console.log('Searching Viator products:', { keyword, limit, apiKey: !!process.env.VIATOR_API_KEY });

  try {
    const requestBody = {
      searchTerm: keyword,
      currency: "CAD",
      searchTypes: [{
        searchType: "PRODUCTS",
        pagination: {
          start: 1,
          count: Math.min(limit, 50)
        }
      }]
    };

    console.log('Viator search request:', {
      url: `${VIATOR_BASE_URL}/search/freetext`,
      headers: {
        'exp-api-key': 'HIDDEN',
        'Accept': 'application/json;version=2.0',
        'Accept-Language': 'en-US',
        'Content-Type': 'application/json'
      },
      body: requestBody
    });

    const response = await fetch(`${VIATOR_BASE_URL}/search/freetext`, {
      method: 'POST',
      headers: {
        'exp-api-key': process.env.VIATOR_API_KEY!,
        'Accept': 'application/json;version=2.0',
        'Accept-Language': 'en-US',
        'Content-Type': 'application/json',
        'campaign-value': process.env.VIATOR_CAMPAIGN_ID || ''
      },
      body: JSON.stringify(requestBody)
    });


    if (!response.ok) {
      const errorText = await response.text();
      console.error('Viator API response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      console.error(`Viator search failed with invalid URL: ${response.url}`); //Added logging for invalid URL
      throw new Error(`Viator search failed (${response.status}): ${errorText}`);
    }

    const responseText = await response.text();
    const data = JSON.parse(responseText);
    return data.products?.results || [];
  } catch (error) {
    console.error('Error searching Viator products:', error);
    return [];
  }
}

export async function getViatorAffiliateUrl(productCode: string): Promise<string | null> {
  try {
    if (!productCode) {
      return null;
    }

    // Get the product URL with campaign value from the product endpoint
    const response = await fetch(`${VIATOR_BASE_URL}/products/${productCode}`, {
      headers: {
        'exp-api-key': process.env.VIATOR_API_KEY!,
        'Accept': 'application/json;version=2.0',
        'Accept-Language': 'en-US',
        'campaign-value': process.env.VIATOR_CAMPAIGN_ID || ''
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch product ${productCode}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    if (!data.webURL) {
      console.error('No webURL found for product:', productCode);
      return null;
    }

    return data.webURL;
  } catch (error) {
    console.error('Error constructing affiliate URL:', error);
    return null;
  }
}