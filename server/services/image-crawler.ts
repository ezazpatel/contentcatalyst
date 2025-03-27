import type { AffiliateImage } from '@shared/schema';
import { VIATOR_BASE_URL } from './viator-api';

function getProductCode(url: string): string {
  return url.split('/').pop() || '';
}

export async function crawlAffiliateLink(productCode: string, heading: string): Promise<AffiliateImage[]> {
  if (!process.env.VIATOR_API_KEY) {
    console.error('No Viator API key configured');
    return [];
  }

  try {
    const response = await fetch(`${VIATOR_BASE_URL}/products/${productCode}`, {
      headers: {
        'exp-api-key': process.env.VIATOR_API_KEY,
        'Accept': 'application/json;version=2.0',
        'Accept-Language': 'en-US'
      }
    });

    if (!response.ok) {
      console.error(`Failed to fetch product ${productCode}: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    const images: AffiliateImage[] = [];

    if (data.images) {
      data.images.forEach((img: any) => {
        // Find highest resolution variant
        const bestVariant = img.variants?.reduce((best: any, current: any) => {
          if (!best || (current.width * current.height) > (best.width * best.height)) {
            return current;
          }
          return best;
        }, null);

        images.push({
          url: bestVariant?.url || img.url,
          alt: img.caption || data.title || 'Product Image',
          affiliateUrl: data.webURL,
          heading,
          cached: false
        });
      });
    }

    return images;
  } catch (error) {
    console.error(`Error fetching product ${productCode}:`, error);
    return [];
  }
}

export async function matchImagesWithHeadings(
  content: string,
  affiliateLinks: { name: string; url: string }[]
): Promise<AffiliateImage[]> {
  const headings = content.match(/^##\s+(.+)$/gm) || [];
  const images: AffiliateImage[] = [];

  for (const link of affiliateLinks) {
    const relevantHeading = headings.find(h =>
      h.toLowerCase().includes(link.name.toLowerCase())
    ) || headings[0] || '## Product Recommendations';

    const heading = relevantHeading.replace(/^##\s+/, '');
    const productCode = getProductCode(link.url);
    const productImages = await crawlAffiliateLink(productCode, heading);
    images.push(...productImages);
  }

  return images;
}

export function insertImagesIntoContent(content: string, images: AffiliateImage[]): string {
  if (!images.length) return content;

  const lines = content.split('\n');
  const newLines: string[] = [];
  const usedCodes = new Set<string>();
  const firstOccurrence = new Set<string>();

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
    newLines.push(line);

    const linkMatch = line.match(/\[([^\]]+)\]\(([^)]+)\)/);
    if (linkMatch) {
      const [_, linkText, url] = linkMatch;
      const code = getProductCode(url);

      if (!firstOccurrence.has(code)) {
        firstOccurrence.add(code);
        continue;
      }

      const productImages = imagesByCode[code];
      if (productImages?.length > 0 && !usedCodes.has(code)) {
        usedCodes.add(code);

        let bestImage = productImages[0];
        let maxResolution = 0;

        productImages.forEach(img => {
          if (img.width && img.height) {
            const resolution = img.width * img.height;
            if (resolution > maxResolution) {
              maxResolution = resolution;
              bestImage = img;
            }
          }
        });

        newLines.push('');
        newLines.push('<div class="product-slideshow">');
        productImages.forEach(img => {
          newLines.push(`<img src="${img.url}" alt="${img.alt}" />`);
        });
        newLines.push('</div>');
        newLines.push('');
      }
    }
  }

  return newLines.join('\n');
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
interface ContentSection {
  text: string;
  images: AffiliateImage[];
}