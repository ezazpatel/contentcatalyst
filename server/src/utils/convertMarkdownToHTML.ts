export function convertMarkdownToHTML(
  markdown: string,
  affiliateImages: any[] = [],
): string {
  const imageInserted: Record<string, boolean> = {};
  const productCodeUsage: Record<string, number> = {};
  const productCodeToImage: Record<string, any> = {};

  // Map each product code to its image
  affiliateImages.forEach((img) => {
    if (img.productCode && !productCodeToImage[img.productCode]) {
      productCodeToImage[img.productCode] = img;
    }
  });

  // Build content line by line, inserting images where needed
  const lines = markdown.split("\n");
  const resultLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    resultLines.push(line);

    for (const img of affiliateImages) {
      const url = img.affiliateUrl;
      if (!url) continue;

      const linkRegex = new RegExp(
        `\\[([^\\]]+)\\]\\(${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`,
        "g",
      );
      const matches = line.match(linkRegex);

      if (matches) {
        const productCode = img.productCode;
        productCodeUsage[productCode] =
          (productCodeUsage[productCode] || 0) + matches.length;

        if (productCodeUsage[productCode] >= 2 && !imageInserted[productCode]) {
          const image = productCodeToImage[productCode];
          if (image && image.url) {
            resultLines.push(`
<!-- wp:image {"sizeSlug":"large"} -->
<figure class="wp-block-image size-large">
  <img src="${image.url}" alt="${image.alt || ""}" />
  <figcaption class="wp-element-caption">${image.alt || ""}</figcaption>
</figure>
<!-- /wp:image -->
`);
            imageInserted[productCode] = true;
          }
        }
      }
    }
  }

  // Now continue with the usual markdown-to-HTML stuff
  let html = resultLines
    .join("\n")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/^### (.*$)/gm, "<h3>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^\s*[-+*]\s+(.*)/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
    .replace(/^\d+\.\s+(.*)/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, "<ol>$&</ol>")
    .replace(/^(?!<[uo]l|<li|<h[1-6])(.*$)/gm, "<p>$1</p>");

  return html;
}
