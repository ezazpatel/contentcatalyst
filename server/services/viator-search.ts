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

    const responseText = await response.text();
    console.log('Viator search response:', {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseText
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Viator API response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Viator search failed (${response.status}): ${responseText}`);
    }

    const data = JSON.parse(responseText);
    console.log('Parsed Viator search results:', {
      totalResults: data.products?.totalCount,
      productCount: data.products?.results?.length || 0
    });
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
    // The webURL property from the search results will already include the campaign parameters
    // because we included campaign-value in the search request headers
    return productCode;
  } catch (error) {
    console.error('Error with affiliate URL:', error);
    return null;
  }
}