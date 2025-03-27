
import { VIATOR_BASE_URL } from './viator-api';

interface ViatorSearchResult {
  productCode: string;
  title: string;
  description: string;
  rating: number;
  reviewCount: number;
  thumbnailUrl: string;
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
    const response = await fetch(`${VIATOR_BASE_URL}/search/freetext`, {
      method: 'POST',
      headers: {
        'exp-api-key': process.env.VIATOR_API_KEY!,
        'Accept': 'application/json;version=2.0',
        'Accept-Language': 'en-US',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        searchTerm: keyword,
        currency: "CAD",
        page: 0,
        size: limit,
        searchTypes: ["DESTINATIONS"],
        destinationIds: ["Canada"]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Viator API response:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      throw new Error(`Viator search failed (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    return data.products || [];
  } catch (error) {
    console.error('Error searching Viator products:', error);
    return [];
  }
}

export async function getViatorAffiliateUrl(productCode: string): Promise<string | null> {
  try {
    const response = await fetch(`${VIATOR_BASE_URL}/products/${productCode}`, {
      headers: {
        'exp-api-key': process.env.VIATOR_API_KEY!,
        'Accept': 'application/json;version=2.0',
        'campaign-value': process.env.VIATOR_CAMPAIGN_ID || ''
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get affiliate URL: ${response.statusText}`);
    }

    const data = await response.json();
    return data.webURL || null;
  } catch (error) {
    console.error('Error getting affiliate URL:', error);
    return null;
  }
}
