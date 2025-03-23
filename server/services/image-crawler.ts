import * as cheerio from 'cheerio';
import type { AffiliateImage } from '@shared/schema';
import { getViatorImages, isViatorLink } from './viator-api';

async function fetchWithTimeout(url: string, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export async function crawlAffiliateLink(url: string, heading: string): Promise<AffiliateImage[]> {
  // Check if it's a Viator link first
  if (isViatorLink(url)) {
    return await getViatorImages(url, heading);
  }

  // Otherwise, fallback to web crawling
  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.statusText}`);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const images: AffiliateImage[] = [];

    // Look for product images with good resolution
    $('img').each((_, element) => {
      const img = $(element);
      const src = img.attr('src');
      const alt = img.attr('alt') || '';

      // Skip small images, icons, and logos
      const width = parseInt(img.attr('width') || '0');
      const height = parseInt(img.attr('height') || '0');
      if ((width > 0 && width < 200) || (height > 0 && height < 200)) {
        return;
      }

      // Skip if no src or if it's a data URL
      if (!src || src.startsWith('data:')) {
        return;
      }

      // Convert relative URLs to absolute
      const imageUrl = new URL(src, url).toString();

      // Only add if it looks like a product image
      if (alt.toLowerCase().includes('product') || 
          src.toLowerCase().includes('product') ||
          alt.length > 20) {
        images.push({
          url: imageUrl,
          alt,
          affiliateUrl: url,
          heading,
          cached: false
        });
      }
    });

    return images;
  } catch (error) {
    console.error(`Error crawling ${url}:`, error);
    return [];
  }
}

export async function matchImagesWithHeadings(
  content: string,
  affiliateLinks: { name: string; url: string }[],
): Promise<AffiliateImage[]> {
  const headings = content.match(/^##\s+(.+)$/gm) || [];
  const images: AffiliateImage[] = [];

  for (const link of affiliateLinks) {
    // Find the most relevant heading for this affiliate link
    const relevantHeading = headings.find(h => 
      h.toLowerCase().includes(link.name.toLowerCase())
    ) || headings[0] || '## Product Recommendations';

    const heading = relevantHeading.replace(/^##\s+/, '');

    // Get images using the appropriate method (Viator API or web crawling)
    const productImages = await crawlAffiliateLink(link.url, heading);
    images.push(...productImages);
  }

  return images;
}

export function insertImagesIntoContent(
  content: string,
  images: AffiliateImage[]
): string {
  const lines = content.split('\n');
  const newLines: string[] = [];
  let currentHeading = '';

  for (const line of lines) {
    newLines.push(line);

    // Check if this is a heading
    if (line.startsWith('## ')) {
      currentHeading = line.replace(/^##\s+/, '');

      // Insert relevant images after this heading
      const relevantImages = images.filter(img => img.heading === currentHeading);
      if (relevantImages.length > 0) {
        newLines.push(''); // Add blank line
        relevantImages.forEach(img => {
          newLines.push(`![${img.alt}](${img.url})`);
          newLines.push(`*[View product](${img.affiliateUrl})*`);
        });
        newLines.push(''); // Add blank line
      }
    }
  }

  return newLines.join('\n');
}