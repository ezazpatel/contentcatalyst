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
  const images: AffiliateImage[] = [];
  return images;
}

export function insertImagesIntoContent(
  content: string,
  images: AffiliateImage[]
): string {
  const lines = content.split('\n');
  const newLines: string[] = [];
  let inAffiliateLinksSection = false;

  // Group images by affiliate URL
  const imagesByUrl = images.reduce((acc, img) => {
    if (!acc[img.affiliateUrl]) {
      acc[img.affiliateUrl] = [];
    }
    acc[img.affiliateUrl].push(img);
    return acc;
  }, {} as Record<string, AffiliateImage[]>);

  for (const line of lines) {
    // Check if we're entering the affiliate links section
    if (line.includes('## Top') && line.includes('Recommendations')) {
      inAffiliateLinksSection = true;
    }
    // Check if we're leaving the affiliate links section
    else if (line.startsWith('## ') && inAffiliateLinksSection) {
      inAffiliateLinksSection = false;
    }

    newLines.push(line);

    // Only process images if we're not in the affiliate links section
    if (!inAffiliateLinksSection) {
      // Check if this line contains an affiliate link
      const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch && imagesByUrl[linkMatch[2]] && !line.startsWith('*[View all photos]')) {
        const [_, linkText, url] = linkMatch;
        const productImages = imagesByUrl[url];

        // Only insert images if we haven't already inserted them for this URL in this section
        if (productImages && !newLines.some(l => l.includes(`*[View all photos](${url})*`))) {
          newLines.push(''); // Add blank line
          newLines.push('<div class="product-slideshow">');
          productImages.forEach((img, index) => {
            newLines.push(`  <img src="${img.url}" alt="${img.alt}" data-index="${index}" data-total="${productImages.length}" />`);
          });
          newLines.push('</div>');
          newLines.push(`*[View all photos](${url})*`);
          newLines.push(''); // Add blank line
        }
      }
    }
  }

  return newLines.join('\n');
}