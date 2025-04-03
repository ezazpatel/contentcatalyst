
import { VIATOR_BASE_URL } from '../services/viator-api';

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
    console.log('All destinations:');
    data.destinations.forEach((dest: any) => {
      console.log(`${dest.name} (ID: ${dest.destinationId}, Type: ${dest.type}${dest.parentDestinationId ? `, Parent: ${dest.parentDestinationId}` : ''})`);
    });

  } catch (error) {
    console.error('Error fetching destinations:', error);
  }
}

fetchDestinations();
