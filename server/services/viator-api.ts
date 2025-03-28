import { AffiliateImage } from '@shared/schema';

// Viator API endpoints
export const VIATOR_BASE_URL = "https://api.viator.com/partner";

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
export function extractProductCode(url: string): string | null {
  try {
    const urlParts = new URL(url);
    const pathSegments = urlParts.pathname.split('/').filter(Boolean);
    const lastSegment = pathSegments[pathSegments.length - 1];
    const codeMatch = lastSegment.match(/(?:d\d+-)?(.+)/);
    return codeMatch ? codeMatch[1] : null;
  } catch (error) {
    console.error('Error parsing URL:', error);
    return null;
  }
}

/**
 * Fetch product details from Viator API
 */
async function fetchViatorProduct(productCode: string): Promise<ViatorProduct | null> {
  try {
    const headers = {
      'exp-api-key': process.env.VIATOR_API_KEY!,
      'Accept': 'application/json;version=2.0',
      'Accept-Language': 'en-US',
      'Cache-Control': 'no-cache',
    };

    const response = await fetch(`${VIATOR_BASE_URL}/products/${productCode}`, {
      headers
    });

    const responseText = await response.text();

    if (!response.ok) {
      console.error(`Error fetching Viator product ${productCode}:`, responseText);
      return null;
    }

    const data = JSON.parse(responseText);
    console.log("Complete Viator product response:", {
      productCode,
      status: data.status,
      images: data.images,
      mediaSettings: data.mediaSettings, // Some APIs use this field
      photos: data.photos, // Alternative field name
      media: data.media, // Another possible field
      raw: data // Full response for inspection
    });

    // Ensure product is available for sale
    if (data.status !== 'ACTIVE') {
      console.warn(`Product ${productCode} is not active:`, data.status);
      return null;
    }

    // Extract high quality image variants
    const productImages = data.images?.map(img => {
      const bestVariant = img.variants?.reduce((best, current) => {
        if (!best || (current.width * current.height) > (best.width * best.height)) {
          return current;
        }
        return best;
      }, null);

      return {
        url: bestVariant?.url || img.url,
        alt: img.caption || data.title || 'Product Image'
      };
    }) || [];

    return {
      productCode,
      title: data.title,
      images: productImages
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
    productCode: product.productCode,
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