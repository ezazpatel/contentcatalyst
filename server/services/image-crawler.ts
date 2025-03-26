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
  if (isViatorLink(url)) {
    return await getViatorImages(url, heading);
  }

  try {
    const response = await fetchWithTimeout(url);
    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.statusText}`);
      return [];
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const images: AffiliateImage[] = [];

    $('img').each((_, element) => {
      const img = $(element);
      const src = img.attr('src');
      const alt = img.attr('alt') || '';

      const width = parseInt(img.attr('width') || '0');
      const height = parseInt(img.attr('height') || '0');
      if ((width > 0 && width < 200) || (height > 0 && height < 200)) {
        return;
      }

      if (!src || src.startsWith('data:')) {
        return;
      }

      const imageUrl = new URL(src, url).toString();

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
    const relevantHeading = headings.find(h =>
      h.toLowerCase().includes(link.name.toLowerCase())
    ) || headings[0] || '## Product Recommendations';

    const heading = relevantHeading.replace(/^##\s+/, '');

    const productImages = await crawlAffiliateLink(link.url, heading);
    images.push(...productImages);
  }

  return images;
}

export function insertImagesIntoContent(content: string, images: AffiliateImage[]): string {
  if (!images.length) return content;

  const lines = content.split('\n');
  const newLines: string[] = [];
  let inRecommendationsSection = false;
  const usedCodes = new Set<string>();

  // Group images by product code
  const imagesByCode = images.reduce((acc, img) => {
    const code = getProductCode(img.affiliateUrl);
    if (!acc[code]) {
      acc[code] = [];
    }
    acc[code].push(img);
    return acc;
  }, {} as Record<string, AffiliateImage[]>);

  for (const line of lines) {
    // Skip adding slideshows in the recommendations section
    if (line.includes('## Top') && line.includes('Recommendations')) {
      inRecommendationsSection = true;
    } else if (line.startsWith('## ') && inRecommendationsSection) {
      inRecommendationsSection = false;
    }

    newLines.push(line);

    if (!inRecommendationsSection) {
      const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
      if (linkMatch) {
        const [_, linkText, url] = linkMatch;
        const code = getProductCode(url);
        const productImages = imagesByCode[code];

        if (productImages?.length > 0 && !usedCodes.has(code)) {
          usedCodes.add(code);
          newLines.push(line);
          newLines.push('');
          newLines.push('<div class="product-slideshow">');
          productImages.forEach(img => {
            newLines.push(`<img src="${img.url}" alt="${img.alt}" />`);
          });
          newLines.push('</div>');
        }
      }
    }
  }

  return newLines.join('\n');
}

function getProductCode(url: string): string {
  // Implement your logic to extract product code from URL here.  This is a placeholder.
  //  For example, you might use a regular expression to extract a code from the URL.
  return url.split('/').pop() || '';
}


import { AffiliateImage } from '@shared/schema';

interface ContentSection {
  text: string;
  images: AffiliateImage[];
}

export function processContentWithImages(
  content: string,
  images: AffiliateImage[]
): ContentSection[] {
  const sections: ContentSection[] = [];
  const lines = content.split('\n');
  let currentText: string[] = [];
  let currentHeading = '';

  const imagesByHeading = images.reduce((acc, img) => {
    if (!acc[img.heading]) {
      acc[img.heading] = [];
    }
    acc[img.heading].push(img);
    return acc;
  }, {} as Record<string, AffiliateImage[]>);

  for (const line of lines) {
    if (line.startsWith('## ')) {
      if (currentText.length > 0) {
        sections.push({
          text: currentText.join('\n'),
          images: imagesByHeading[currentHeading] || []
        });
        currentText = [];
      }
      currentHeading = line.replace(/^##\s+/, '');
    }
    currentText.push(line);
  }

  if (currentText.length > 0) {
    sections.push({
      text: currentText.join('\n'),
      images: imagesByHeading[currentHeading] || []
    });
  }

  return sections;
}