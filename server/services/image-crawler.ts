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
  let inAffiliateLinksSection = false;

  // Group images by affiliate URL and heading
  const imagesByUrlAndHeading = images.reduce((acc, img) => {
    const key = `${img.affiliateUrl}|${img.heading}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(img);
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
    // Update current heading
    else if (line.startsWith('## ')) {
      currentHeading = line.replace(/^##\s+/, '');
    }

    newLines.push(line);

    // Only process images if we're not in the affiliate links section
    if (!inAffiliateLinksSection) {
      // Check if this line contains an affiliate link
      const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const [_, linkText, url] = linkMatch;
        const key = `${url}|${currentHeading}`;
        const productImages = imagesByUrlAndHeading[key];

        // Only insert images if:
        // 1. We have images for this URL and heading combination
        // 2. We haven't already inserted a slideshow in this section
        // 3. The link text or current heading contains some keywords from the image heading
        if (productImages &&
            !newLines.some(l => l.includes(`class="product-slideshow"`)) &&
            (linkText.toLowerCase().includes(productImages[0].heading.toLowerCase()) ||
             currentHeading.toLowerCase().includes(productImages[0].heading.toLowerCase()))) {
          newLines.push(''); // Add blank line
          newLines.push('<div class="product-slideshow">');
          productImages.forEach((img, index) => {
            newLines.push(`  <img src="${img.url}" alt="${img.alt}" data-index="${index}" data-total="${productImages.length}" data-affiliate-url="${img.affiliateUrl || img.url}" />`);
          });
          newLines.push('</div>');
          newLines.push(''); // Add blank line
        }
      }
    }
  }

  return newLines.join('\n');
}