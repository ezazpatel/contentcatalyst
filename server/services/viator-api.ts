import { AffiliateImage } from "@shared/schema";

// Viator API endpoints
const VIATOR_BASE_URL = "https://api.sandbox.viator.com/v2";

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
 * Example: https://www.viator.com/tours/Vancouver/vancouver-flyover-canada-experience/d616-123456 -> 123456
 */
function extractProductCode(url: string): string | null {
  // Look for the pattern d###-#####P# before any query parameters
  const match = url.match(/d\d+-(\d+P\d+)/);
  return match ? match[1] : null;
}

/**
 * Fetch product details from Viator API
 */
async function fetchViatorProduct(productCode: string): Promise<ViatorProduct | null> {
  try {
    const response = await fetch(`${VIATOR_BASE_URL}/products/${productCode}`, {
      headers: {
        'Accept': 'application/json',
        'exp-api-key': process.env.VIATOR_API_KEY!,
        'Accept-Language': 'en-US'
      }
    });

    if (!response.ok) {
      console.error(`Error fetching Viator product ${productCode}:`, await response.text());
      return null;
    }

    const data = await response.json();
    return {
      productCode,
      title: data.title,
      images: data.images.map((img: any) => ({
        url: img.url,
        alt: img.caption || data.title
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
  return url.includes('viator.com') || url.includes('getyourguide.com');
}