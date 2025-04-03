
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

    // First fetch all destinations
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

    // Get Canada and its descendants
    const CANADA_ID = 75;
    const canada = destinations.find(d => d.destinationId === CANADA_ID);
    
    async function getProductCount(destId: number): Promise<number> {
      const searchResponse = await fetch(`${VIATOR_BASE_URL}/search/freetext`, {
        method: 'POST',
        headers: {
          'exp-api-key': process.env.VIATOR_API_KEY!,
          'Accept': 'application/json;version=2.0',
          'Accept-Language': 'en-US',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          productFiltering: {
            ancestorDestinationIds: [destId]
          },
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

    // Print Canada's product count
    const canadaCount = await getProductCount(CANADA_ID);
    console.log(`\n🍁 ${canada?.name} (ID: ${CANADA_ID}) - ${canadaCount} products`);

    // Get provinces (direct children of Canada)
    const provinces = destinations.filter(d => d.parentDestinationId === CANADA_ID);
    for (const province of provinces) {
      const provinceCount = await getProductCount(province.destinationId);
      console.log(`  └─ ${province.name} (ID: ${province.destinationId}) - ${provinceCount} products`);
      
      // Get cities in each province
      const cities = destinations.filter(d => d.parentDestinationId === province.destinationId);
      for (const city of cities) {
        const cityCount = await getProductCount(city.destinationId);
        console.log(`     └─ ${city.name} (ID: ${city.destinationId}) - ${cityCount} products`);
      }
    }

  } catch (error) {
    console.error('Error analyzing destinations:', error);
  }
}

analyzeDestinations();
