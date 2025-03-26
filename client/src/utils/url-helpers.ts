
/**
 * Extracts product code from a URL by cleaning and standardizing the URL format
 */
export function getProductCode(url: string): string {
  // Remove query parameters
  const cleanedUrl = url.split('?')[0];
  // Remove any trailing slashes
  const trimmedUrl = cleanedUrl.replace(/\/+$/, '');
  // Extract the last segment as the product code
  const parts = trimmedUrl.split('/');
  return parts[parts.length - 1];
}
