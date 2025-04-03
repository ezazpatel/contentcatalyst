
import { VIATOR_BASE_URL } from '../services/viator-api';

interface ViatorDestination {
  destinationId: number;
  name: string;
  type: string;
  parentDestinationId?: number;
}

async function fetchDestinations() {
  try {
    if (!process.env.VIATOR_API_KEY) {
      console.error('VIATOR_API_KEY not found in environment');
      return;
    }

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
    if (!canada) {
      console.error('Could not find Canada in destinations');
      return;
    }

    // Print Canada first
    console.log('\nCanada and its destinations:');
    console.log(`🍁 ${canada.name} (ID: ${canada.destinationId}, Type: ${canada.type})`);

    // Get provinces (direct children of Canada)
    const provinces = destinations.filter(d => d.parentDestinationId === CANADA_ID);
    provinces.forEach(province => {
      console.log(`  └─ ${province.name} (ID: ${province.destinationId}, Type: ${province.type})`);
      
      // Get cities in each province
      const cities = destinations.filter(d => d.parentDestinationId === province.destinationId);
      cities.forEach(city => {
        console.log(`     └─ ${city.name} (ID: ${city.destinationId}, Type: ${city.type})`);
        
        // Get any attractions or landmarks in the cities
        const attractions = destinations.filter(d => d.parentDestinationId === city.destinationId);
        attractions.forEach(attraction => {
          console.log(`        └─ ${attraction.name} (ID: ${attraction.destinationId}, Type: ${attraction.type})`);
        });
      });
    });

  } catch (error) {
    console.error('Error fetching destinations:', error);
  }
}

fetchDestinations();
