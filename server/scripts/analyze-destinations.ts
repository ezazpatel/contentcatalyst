
import { VIATOR_BASE_URL } from '../services/viator-api';

interface ViatorDestination {
  destinationId: number;
  name: string;
  type: string;
  parentDestinationId?: number;
}

interface ProductDestination {
  destinationId: number;
  destinationName: string;
  destinationType: string;
  lookupId: string;
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

    // Helper: Get sample products for a destination
    async function getSampleProducts(destinationId: number): Promise<any[]> {
      const searchResponse = await fetch(`${VIATOR_BASE_URL}/search/freetext`, {
        method: 'POST',
        headers: {
          'exp-api-key': process.env.VIATOR_API_KEY!,
          'Accept': 'application/json;version=2.0',
          'Accept-Language': 'en-US',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          searchTerm: 'tour',
          currency: 'CAD',
          productFiltering: {
            destination: destinationId
          },
          searchTypes: [{
            searchType: 'PRODUCTS',
            pagination: {
              start: 1,
              count: 3 // Get 3 sample products
            }
          }]
        })
      });

      if (!searchResponse.ok) return [];
      const searchData = await searchResponse.json();
      return searchData.products?.results || [];
    }

    // Helper: Get full product details
    async function getProductDetails(productCode: string): Promise<any> {
      const productResponse = await fetch(`${VIATOR_BASE_URL}/products/${productCode}`, {
        headers: {
          'exp-api-key': process.env.VIATOR_API_KEY!,
          'Accept': 'application/json;version=2.0',
          'Accept-Language': 'en-US'
        }
      });

      if (!productResponse.ok) return null;
      return await productResponse.json();
    }

    // Canada is known to have destinationId 75
    const CANADA_ID = 75;
    const canada = destinations.find(d => d.destinationId === CANADA_ID);
    if (!canada) {
      console.error('Could not find Canada in destinations list');
      return;
    }

    console.log('\n🍁 Analyzing Canada and its destinations:');
    
    // Get sample products for Canada
    console.log(`\nCanada (ID: ${CANADA_ID})`);
    const canadaProducts = await getSampleProducts(CANADA_ID);
    if (canadaProducts.length > 0) {
      console.log('Sample Products:');
      for (const product of canadaProducts) {
        const details = await getProductDetails(product.productCode);
        console.log(`\n  Product: ${product.title}`);
        console.log('  Product Code:', product.productCode);
        console.log('  Tagged Destinations:', details.destinations?.map((d: ProductDestination) => 
          `\n    - ${d.destinationName} (ID: ${d.destinationId}, Type: ${d.destinationType})`
        ).join('') || 'None');
      }
    }

    // Get provinces (direct children of Canada)
    const provinces = destinations.filter(d => d.parentDestinationId === CANADA_ID);
    for (const province of provinces) {
      console.log(`\n📍 ${province.name} (ID: ${province.destinationId})`);
      const provinceProducts = await getSampleProducts(province.destinationId);
      
      if (provinceProducts.length > 0) {
        console.log('Sample Products:');
        for (const product of provinceProducts) {
          const details = await getProductDetails(product.productCode);
          console.log(`\n  Product: ${product.title}`);
          console.log('  Product Code:', product.productCode);
          console.log('  Tagged Destinations:', details.destinations?.map((d: ProductDestination) => 
            `\n    - ${d.destinationName} (ID: ${d.destinationId}, Type: ${d.destinationType})`
          ).join('') || 'None');
        }
      }

      // Get cities in each province
      const cities = destinations.filter(d => d.parentDestinationId === province.destinationId);
      for (const city of cities) {
        console.log(`\n  🏙️ ${city.name} (ID: ${city.destinationId})`);
        const cityProducts = await getSampleProducts(city.destinationId);
        
        if (cityProducts.length > 0) {
          console.log('  Sample Products:');
          for (const product of cityProducts) {
            const details = await getProductDetails(product.productCode);
            console.log(`\n    Product: ${product.title}`);
            console.log('    Product Code:', product.productCode);
            console.log('    Tagged Destinations:', details.destinations?.map((d: ProductDestination) => 
              `\n      - ${d.destinationName} (ID: ${d.destinationId}, Type: ${d.destinationType})`
            ).join('') || 'None');
          }
        }
      }
    }
  } catch (error) {
    console.error('Error analyzing destinations:', error);
  }
}

analyzeDestinations();
