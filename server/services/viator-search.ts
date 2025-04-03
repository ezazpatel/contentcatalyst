
import { VIATOR_BASE_URL } from './viator-api';

interface ViatorSearchResult {
  productCode: string;
  title: string;
  description: string;
  rating: number;
  reviewCount: number;
  thumbnailUrl: string;
  webURL: string;
}

interface ViatorDestination {
  destinationId: number;
  name: string;
  type: string;
  parentDestinationId?: number;
}

interface ViatorSearchResponse {
  products: {
    results: ViatorSearchResult[];
  };
  totalCount: number;
}

async function getDestinationChildren(destinationId: number): Promise<number[]> {
  try {
    const response = await fetch(`${VIATOR_BASE_URL}/destinations/${destinationId}/children`, {
      headers: {
        'exp-api-key': process.env.VIATOR_API_KEY!,
        'Accept': 'application/json;version=2.0',
        'Accept-Language': 'en-US'
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch children for destination ${destinationId}`);
      return [];
    }

    const data = await response.json();
    const immediateChildren = data.destinations?.map((dest: ViatorDestination) => dest.destinationId) || [];
    
    // Recursively get children of children
    const childrenOfChildren = await Promise.all(
      immediateChildren.map(childId => getDestinationChildren(childId))
    );

    return [...immediateChildren, ...childrenOfChildren.flat()];
  } catch (error) {
    console.error(`Error fetching children for destination ${destinationId}:`, error);
    return [];
  }
}

export async function searchViatorProducts(keyword: string, limit: number = 10): Promise<ViatorSearchResult[]> {
  if (!process.env.VIATOR_API_KEY) {
    return [];
  }

  try {
    console.log('🔍 Starting destination lookup for Canada...');

    // First get Canada's destination ID
    const destResponse = await fetch(`${VIATOR_BASE_URL}/destinations?query=Canada`, {
      headers: {
        'exp-api-key': process.env.VIATOR_API_KEY!,
        'Accept': 'application/json;version=2.0',
        'Accept-Language': 'en-US'
      }
    });

    console.log('📡 Destination API Response Status:', destResponse.status);
    const destData = await destResponse.json();

    // Find the Canada destination
    const canadaDestination: ViatorDestination | undefined = destData.destinations?.find((dest: ViatorDestination) =>
      dest.name.toLowerCase() === 'canada' && dest.type === 'COUNTRY'
    );

    if (!canadaDestination) {
      console.error('❌ Could not find Canada destination');
      return [];
    }

    console.log('✅ Found Canada destination:', {
      name: canadaDestination.name,
      id: canadaDestination.destinationId
    });

    // Get all descendant destinations recursively
    const descendantIds = await getDestinationChildren(canadaDestination.destinationId);
    const allDestinationIds = [canadaDestination.destinationId, ...descendantIds];

    console.log('🗺️ Using destination IDs for filtering:', {
      total: allDestinationIds.length,
      ids: allDestinationIds
    });

    const requestBody = {
      searchTerm: keyword,
      currency: "CAD",
      productFiltering: {
        destinationIds: allDestinationIds
      },
      searchTypes: [{
        searchType: "PRODUCTS",
        pagination: {
          start: 1,
          count: Math.min(limit, 50)
        }
      }]
    };

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

    console.log('📡 Search API Response Status:', response.status);

    const responseText = await response.text();

    if (!response.ok) {
      console.error('Viator API response error:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      });
      return [];
    }

    const data: ViatorSearchResponse = JSON.parse(responseText);
    if (!data.products || !Array.isArray(data.products.results)) {
      return [];
    }

    return data.products.results;
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

    const response = await fetch(`${VIATOR_BASE_URL}/products/${productCode}`, {
      headers: {
        'exp-api-key': process.env.VIATOR_API_KEY!,
        'Accept': 'application/json;version=2.0',
        'Accept-Language': 'en-US',
        'campaign-value': process.env.VIATOR_CAMPAIGN_ID || '',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch product ${productCode}: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    const baseUrl = data.webURL || data.bookingUrl || data.productUrl;

    if (!baseUrl) {
      console.error('No URL found for product:', productCode, 'Response:', JSON.stringify(data));
      return null;
    }

    const url = new URL(baseUrl);
    url.searchParams.set('mcid', '42383');
    url.searchParams.set('pid', process.env.VIATOR_CAMPAIGN_ID || 'P00217628');
    url.searchParams.set('medium', 'api');
    url.searchParams.set('api_version', '2.0');

    return url.toString();
  } catch (error) {
    console.error('Error constructing affiliate URL:', error);
    return null;
  }
}
