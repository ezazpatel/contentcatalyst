import { VIATOR_BASE_URL } from '../services/viator-api';

interface ViatorDestination {
  destinationId: number;
  name: string;
  type: string;
  parentDestinationId?: number;
}

async function analyzeDestinations() {
  try {
    if (!process.env.VIATOR_API_KEY) {
      console.error('VIATOR_API_KEY not found in environment');
      return;
    }

    // Fetch all destinations
    const response = await fetch(`${VIATOR_BASE_URL}/destinations`, {
      headers: {
        'exp-api-key': process.env.VIATOR_API_KEY,
        'Accept': 'application/json;version=2.0',
        'Accept-Language': 'en-US'
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch destinations:', response.statusText);
      return;
    }

    const data = await response.json();
    const destinations = data.destinations as ViatorDestination[];

    // Canada is known to have destinationId 75
    const CANADA_ID = 75;
    const canada = destinations.find(d => d.destinationId === CANADA_ID);
    if (!canada) {
      console.error('Could not find Canada in destinations list');
      return;
    }

    // Helper: Get product count for a destination using the appropriate filter
    async function getProductCount(dest: ViatorDestination): Promise<number> {
      // If the destination is a country, use ancestorDestinationIds,
      // otherwise use the direct destination filter.
      const productFiltering = dest.type === 'COUNTRY'
        ? { ancestorDestinationIds: [dest.destinationId] }
        : { destination: dest.destinationId };

      const searchResponse = await fetch(`${VIATOR_BASE_URL}/search/freetext`, {
        method: 'POST',
        headers: {
          'exp-api-key': process.env.VIATOR_API_KEY!,
          'Accept': 'application/json;version=2.0',
          'Accept-Language': 'en-US',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          searchTerm: 'tour', // broad term to capture most products
          currency: 'CAD',
          productFiltering,
          searchTypes: [{
            searchType: 'PRODUCTS',
            pagination: {
              start: 1,
              count: 1
            }
          }]
        })
      });

      if (!searchResponse.ok) return 0;
      const searchData = await searchResponse.json();
      return searchData.products?.totalCount || 0;
    }

    // Get product count for Canada (country-level; using ancestorDestinationIds)
    const canadaCount = await getProductCount(canada);
    console.log(`\n🍁 ${canada.name} (ID: ${CANADA_ID}) - ${canadaCount} products`);

    // Get provinces: direct children of Canada (type REGION)
    const provinces = destinations.filter(d => d.parentDestinationId === CANADA_ID);
    for (const province of provinces) {
      // For regions, use the direct destination filter (not ancestor)
      const provinceCount = await getProductCount(province);
      console.log(`  └─ ${province.name} (ID: ${province.destinationId}) - ${provinceCount} products`);

      // Get cities in each province (type CITY)
      const cities = destinations.filter(d => d.parentDestinationId === province.destinationId);
      for (const city of cities) {
        const cityCount = await getProductCount(city);
        console.log(`     └─ ${city.name} (ID: ${city.destinationId}) - ${cityCount} products`);
      }
    }
  } catch (error) {
    console.error('Error analyzing destinations:', error);
  }
}

analyzeDestinations();
