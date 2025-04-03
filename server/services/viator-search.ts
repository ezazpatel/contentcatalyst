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
    return [];
  }

  try {
    console.log('🔍 Starting destination ID lookup for Canada...');
    
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
    const canadaDestination = destData.destinations?.find(dest => 
      dest.name.toLowerCase() === 'canada' && dest.type === 'COUNTRY'
    );
    
    console.log('🗺️ Destination API Response:', {
      totalDestinations: destData.destinations?.length || 0,
      foundCanada: canadaDestination ? {
        name: canadaDestination.name,
        type: canadaDestination.type,
        id: canadaDestination.destinationId
      } : null
    });

    const canadaDestId = canadaDestination?.destinationId;

    if (!canadaDestId) {
      console.error('❌ Could not find destination ID for Canada');
      return [];
    }

    console.log('✅ Found Canada destination ID:', canadaDestId);

    // Use ancestorDestinationIds in product filtering to capture all Canadian experiences
    // Get Canadian cities/regions first
    const canadianDestResponse = await fetch(`${VIATOR_BASE_URL}/destinations/${canadaDestId}/children`, {
      headers: {
        'exp-api-key': process.env.VIATOR_API_KEY!,
        'Accept': 'application/json;version=2.0',
        'Accept-Language': 'en-US'
      }
    });
    
    const canadianDests = await canadianDestResponse.json();
    const canadianDestIds = canadianDests.destinations?.map(d => d.destinationId) || [];
    
    const requestBody = {
      searchTerm: keyword,
      currency: "CAD",
      productFiltering: {
        ancestorDestinationIds: [canadaDestId],
        destinationIds: canadianDestIds
      },
      searchTypes: [{
        searchType: "PRODUCTS",
        pagination: {
          start: 1,
          count: Math.min(limit, 50)
        }
      }]
    };

    console.log('🔍 Searching products with filters:', {
      searchTerm: keyword,
      destinationId: canadaDestId,
      limit
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

    console.log('📡 Search API Response Status:', response.status);

    const responseText = await response.text();

    if (!response.ok) {
      console.error('Viator API response:', {
        status: response.status,
        statusText: response.statusText,
        body: responseText
      });
      return [];
    }

    const data = JSON.parse(responseText);

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

    // Get the product URL with campaign value from the product endpoint
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

    // Get the product URL and clean it
    const baseUrl = data.webURL || data.bookingUrl || data.productUrl;

    if (!baseUrl) {
      console.error('No URL found for product:', productCode, 'Response:', JSON.stringify(data));
      return null;
    }

    // Construct URL with campaign parameters
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
