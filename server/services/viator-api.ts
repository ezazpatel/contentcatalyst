import { AffiliateImage } from '@shared/schema';

// Viator API endpoints
const VIATOR_BASE_URL = "https://api.viator.com/partner";

interface ViatorProduct {
  productCode: string;
  title: string;
  images: {
    url: string;
    alt?: string;
  }[];
}

/**
 * Extract product code from Viator URL using the last segment approach
 * This will work with any URL format as long as the product code is the last segment
 * Examples:
 * - /d616-123456P7 -> 123456P7
 * - /3020_VAN7 -> 3020_VAN7
 * - /d817-5518724P7 -> 5518724P7
 */
function extractProductCode(url: string): string | null {
  console.log(`Extracting product code from URL: ${url}`);
  try {
    // Split the URL by forward slashes and get segments
    const urlParts = new URL(url);
    const pathSegments = urlParts.pathname.split('/').filter(Boolean);

    // Get the last segment before any query parameters
    const lastSegment = pathSegments[pathSegments.length - 1];

    // Extract the product code from the last segment
    // It could be after 'd###-' or just the code itself
    const codeMatch = lastSegment.match(/(?:d\d+-)?(.+)/);
    const productCode = codeMatch ? codeMatch[1] : null;

    console.log(`Extracted product code: ${productCode}`);
    return productCode;
  } catch (error) {
    console.error('Error parsing URL:', error);
    return null;
  }
}

/**
 * Fetch product details from Viator API
 */
async function fetchViatorProduct(productCode: string): Promise<ViatorProduct | null> {
  console.log(`Fetching Viator product with code: ${productCode}`);
  try {
    // According to Viator API docs, we need these specific headers
    const headers = {
      'Accept': 'application/json',
      'api-key': process.env.VIATOR_API_KEY!, // Changed from exp-api-key to api-key
      'Accept-Language': 'en-US',
      'Cache-Control': 'no-cache',
      'Content-Type': 'application/json'
    };

    console.log('Using headers:', JSON.stringify(headers, null, 2));

    const response = await fetch(`${VIATOR_BASE_URL}/v1/products/${productCode}`, {
      headers
    });

    const responseText = await response.text();
    console.log(`Viator API Response for ${productCode}:`, responseText);

    if (!response.ok) {
      console.error(`Error fetching Viator product ${productCode}:`, responseText);
      return null;
    }

    const data = JSON.parse(responseText);
    return {
      productCode,
      title: data.title || data.productTitle,
      images: (data.photos || data.images || []).map((img: any) => ({
        url: img.photoUrl || img.url,
        alt: img.caption || img.alt || data.title || 'Product Image'
      }))
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