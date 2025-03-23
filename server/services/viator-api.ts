import { AffiliateImage } from '@shared/schema';

// Viator API endpoints
const VIATOR_BASE_URL = "https://api.sandbox.viator.com/partner";

interface ViatorProduct {
  productCode: string;
  title: string;
  images: {
    url: string;
    alt?: string;
  }[];
}

/**
 * Extract product code from Viator URL
 * Example: https://www.viator.com/tours/Vancouver/vancouver-flyover-canada-experience/d616-123456P7 -> 123456P7
 */
function extractProductCode(url: string): string | null {
  // Look for the pattern P\d+ at the end of the URL (before any query parameters)
  const match = url.match(/[-/](\d+P\d+)(?:\?|$)/);
  console.log(`Extracting product code from URL: ${url}`);
  console.log(`Extracted product code: ${match ? match[1] : 'none'}`);
  return match ? match[1] : null;
}

/**
 * Fetch product details from Viator API
 */
async function fetchViatorProduct(productCode: string): Promise<ViatorProduct | null> {
  console.log(`Fetching Viator product with code: ${productCode}`);
  try {
    const response = await fetch(`${VIATOR_BASE_URL}/products/${productCode}`, {
      headers: {
        'Accept': 'application/json;version=2.0',
        'exp-api-key': process.env.VIATOR_API_KEY!,
        'Accept-Language': 'en-US',
        'content-type': 'application/json'
      }
    });

    const responseText = await response.text();
    console.log(`Viator API Response for ${productCode}:`, responseText);

    if (!response.ok) {
      console.error(`Error fetching Viator product ${productCode}:`, responseText);
      return null;
    }

    const data = JSON.parse(responseText);

    // Map the Viator API response structure to our interface
    return {
      productCode,
      title: data.title,
      images: data.photos?.map((photo: any) => ({
        url: photo.photoUrl,
        alt: photo.caption || data.title
      })) || []
    };
  } catch (error) {
    console.error(`Error fetching Viator product ${productCode}:`, error);
    return null;
  }
}

/**
 * Get images for a Viator affiliate link
 */
export async function getViatorImages(url: string, heading: string): Promise<AffiliateImage[]> {
  const productCode = extractProductCode(url);
  if (!productCode) {
    console.warn(`Could not extract product code from Viator URL: ${url}`);
    return [];
  }

  const product = await fetchViatorProduct(productCode);
  if (!product || !product.images.length) {
    console.warn(`No product data found for Viator product code: ${productCode}`);
    return [];
  }

  // Convert to our AffiliateImage format
  return product.images.map(img => ({
    url: img.url,
    alt: img.alt || product.title,
    affiliateUrl: url,
    heading,
    cached: false
  }));
}

/**
 * Check if a URL is a Viator affiliate link
 */
export function isViatorLink(url: string): boolean {
  return url.includes('viator.com');
}