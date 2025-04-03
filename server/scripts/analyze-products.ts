
import { VIATOR_BASE_URL } from '../services/viator-api';

interface ViatorProduct {
  productCode: string;
  title: string;
  status: string;
  destinations: {
    destinationId: number;
    destinationName: string;
    destinationType: string;
  }[];
  webURL: string;
  bookingUrl: string;
  price: {
    fromPrice: number;
    currencyCode: string;
  };
}

async function analyzeProducts() {
  try {
    if (!process.env.VIATOR_API_KEY) {
      console.error('VIATOR_API_KEY not found in environment');
      return;
    }

    // First, get a list of products using search
    const searchResponse = await fetch(`${VIATOR_BASE_URL}/search/freetext`, {
      method: 'POST',
      headers: {
        'exp-api-key': process.env.VIATOR_API_KEY,
        'Accept': 'application/json;version=2.0',
        'Accept-Language': 'en-US',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        searchTerm: 'canada tour',
        currency: 'CAD',
        productFiltering: {
          destination: 75 // Canada
        },
        searchTypes: [{
          searchType: 'PRODUCTS',
          pagination: {
            start: 1,
            count: 10
          }
        }]
      })
    });

    if (!searchResponse.ok) {
      console.error('Failed to search products:', searchResponse.statusText);
      return;
    }

    const searchData = await searchResponse.json();
    const products = searchData.products?.results || [];

    console.log(`\n📦 Analyzing ${products.length} products:\n`);

    // Analyze each product in detail
    for (const product of products) {
      const productResponse = await fetch(`${VIATOR_BASE_URL}/products/${product.productCode}`, {
        headers: {
          'exp-api-key': process.env.VIATOR_API_KEY,
          'Accept': 'application/json;version=2.0',
          'Accept-Language': 'en-US'
        }
      });

      if (!productResponse.ok) {
        console.error(`Failed to fetch product ${product.productCode}:`, productResponse.statusText);
        continue;
      }

      const productData: ViatorProduct = await productResponse.json();

      console.log(`Product: ${productData.title}`);
      console.log(`Code: ${productData.productCode}`);
      console.log(`Status: ${productData.status}`);
      console.log('Destinations:', productData.destinations?.map(d => 
        `\n  - ${d.destinationName} (ID: ${d.destinationId}, Type: ${d.destinationType})`
      ).join('') || 'None');
      console.log(`Price: ${productData.price?.fromPrice} ${productData.price?.currencyCode}`);
      console.log(`Booking URL: ${productData.bookingUrl || productData.webURL}`);
      console.log('\n---\n');

      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

  } catch (error) {
    console.error('Error analyzing products:', error);
  }
}

analyzeProducts();
