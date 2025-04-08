import { Anthropic } from "@anthropic-ai/sdk";
import { storage } from "./storage";
import { BlogPost } from "@shared/schema";
import { VIATOR_BASE_URL } from "./services/viator-api";
import {
  searchViatorProducts,
  getViatorAffiliateUrl,
} from "./services/viator-search";
import { convertMarkdownToHTML } from "./src/utils/convertMarkdownToHTML";

/**
 * Extracts text content from an Anthropic API response, handling different response formats
 * @param response The response from Anthropic API
 * @returns The extracted text content
 */
function extractTextFromResponse(response) {
  if (!response || !response.content) return '';

  if (Array.isArray(response.content)) {
    // For Claude 3.7 format
    if (response.content[0] && response.content[0].text) {
      return response.content[0].text;
    } else if (typeof response.content[0] === 'string') {
      return response.content[0];
    }
  } else if (typeof response.content === 'string') {
    // For older API format
    return response.content;
  }

  // If all else fails
  return JSON.stringify(response.content);
}

function trimToCompleteSentence(text) {
  // If the text already ends with a sentence-ending punctuation, return as is
  if (text.endsWith(".") || text.endsWith("!") || text.endsWith("?")) {
    return text;
  }

  // Find the last occurrence of sentence-ending punctuation
  const lastSentenceEnd = Math.max(
    text.lastIndexOf(". "), // Note the space after period to avoid cutting at abbreviations
    text.lastIndexOf("! "),
    text.lastIndexOf("? "),
  );

  // If we found a valid endpoint, trim to that point plus the punctuation mark
  if (lastSentenceEnd > 0) {
    return text.substring(0, lastSentenceEnd + 1); // Include the period
  }

  // Fallback: if no sentence endings were found with spaces after, try without spaces
  const absoluteLastEnd = Math.max(
    text.lastIndexOf("."),
    text.lastIndexOf("!"),
    text.lastIndexOf("?"),
  );

  if (absoluteLastEnd > 0) {
    return text.substring(0, absoluteLastEnd + 1);
  }

  // If no sentence endings are found at all, return the original text
  return text;
}

// Create an Anthropic client
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const ANTHROPIC_MODEL = "claude-3-5-haiku-latest";

async function findRelevantPosts(
  keyword: string,
  posts: BlogPost[],
  limit: number = 3,
): Promise<any[]> {
  const keywordWords = keyword.toLowerCase().split(/\s+/);

  return posts
    .filter((post) => post.status === "published" && post.wordpressUrl)
    .map((post) => ({
      post,
      relevance: keywordWords.reduce(
        (score, word) =>
          score +
          (post.title.toLowerCase().includes(word) ? 1 : 0) +
          (post.keywords.some((k) => k.toLowerCase().includes(word)) ? 0.5 : 0),
        0,
      ),
    }))
    .filter(({ relevance }) => relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit)
    .map(({ post }) => ({
      title: post.title,
      url: post.wordpressUrl,
      description: post.description,
    }));
}

async function uploadImageToWordPress(imageUrl: string): Promise<number> {
  const imageResponse = await fetch(imageUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  const authToken = Buffer.from(
    `${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_AUTH_TOKEN}`,
  ).toString("base64");

  const uploadResponse = await fetch(
    `${process.env.WORDPRESS_API_URL}/wp/v2/media`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${authToken}`,
        "Content-Disposition": `attachment; filename="featured.jpg"`,
        "Content-Type": "image/jpeg", // you can make this dynamic based on the file type if needed
      },
      body: Buffer.from(imageBuffer),
    },
  );

  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`❌ Error uploading image to WordPress: ${errorText}`);
  }

  const data = await uploadResponse.json();
  return data.id; // This is the media ID to use as featured_media
}

async function generateContent(
  keywords: string[],
  description: string = "",
  post: any = {},
  secondaryKeywords: string[] = [],
): Promise<{
  content: string;
  title: string;
  description: string;
  images: any[];
}> {
  let validProducts: any[] = [];

  try {
    console.log(
      `Searching Viator products for keywords: ${keywords.join(" ")}`,
    );
    const viatorProducts = await searchViatorProducts(keywords.join(" "), 100);
    validProducts = Array.isArray(viatorProducts) ? viatorProducts : [];
    console.log(`Found ${validProducts.length} initial Viator products`);
  } catch (error) {
    console.error("Error searching Viator products:", error);
    return null;
  }

  console.log("Generating affiliate URLs for products...");
  const affiliateLinks = await Promise.all(
    validProducts.map(async (product) => {
      const url = await getViatorAffiliateUrl(product.productCode);

      // Fetch product details to get destination info
      const productResponse = await fetch(
        `${VIATOR_BASE_URL}/products/${product.productCode}`,
        {
          headers: {
            "exp-api-key": process.env.VIATOR_API_KEY!,
            Accept: "application/json;version=2.0",
            "Accept-Language": "en-US",
          },
        },
      );

      const productData = await productResponse.json();
      // Access destinations array from the correct path in response
      const destinations =
        productData.destinations?.map((d) => ({
          name: d.destinationName,
          id: d.destinationId,
        })) || [];

      console.log(`Product: "${product.title}"
Product Code: ${product.productCode}
Destinations: ${destinations.length > 0 ? destinations.map((d) => `${d.name} (${d.id})`).join(", ") : "None found"}
Affiliate URL: ${url || "Not generated"}\n`);

      return {
        name: product.title,
        url,
        description: product.description,
        images: product.images || [],
        productCode: product.productCode,
      };
    }),
  ).then((links) => links.filter((link) => link !== null));

  console.log(
    `Processing Results:
    - Initial products found: ${validProducts.length}
    - Products with valid affiliate URLs: ${affiliateLinks.length}
    - Total images collected: ${affiliateLinks.reduce((sum, link) => sum + (link.images?.length || 0), 0)}
    `,
  );

  if (affiliateLinks.length === 0) {
    console.log("⚠️ No valid affiliate links found - possible reasons:");
    console.log("- No matching products for the given keywords");
    console.log("- Products found but affiliate URLs could not be generated");
    console.log("- API rate limits or temporary service issues");
    console.log("\nContent generation will continue without affiliate content");
  }

  // Filter out products where we couldn't get affiliate URLs
  const validAffiliateLinks = affiliateLinks.filter((link) => !!link.url);

  // Extract affiliate images from valid links, maintaining product code reference
  const affiliateImages = validAffiliateLinks.flatMap((link) =>
    (link.images || []).map((img) => {
      // Sort variants by resolution in descending order
      const sortedVariants =
        img.variants?.sort((a, b) => b.width * b.height - a.width * a.height) ||
        [];

      // Get the highest resolution variant or fallback to original URL
      const bestVariant = sortedVariants[0];
      const imageUrl = bestVariant?.url || img.url;

      return {
        url: imageUrl,
        alt: img.alt || link.name,
        affiliateUrl: link.url,
        productCode: link.productCode,
        heading: "", // To be set during placement if needed
      };
    }),
  );

  // Find relevant internal links
  const allPosts = await storage.getAllBlogPosts();
  const internalLinks = await findRelevantPosts(keywords.join(" "), allPosts);

  // Add the found links to the post object
  post.affiliateLinks = validAffiliateLinks;
  post.internalLinks = internalLinks;

  try {
    console.log("Step 1: Generating title and outline...");
    const mainKeywords = secondaryKeywords.length > 0 ? secondaryKeywords : keywords;
    const outlinePrompt = `Write a helpful and engaging blog post about: ${mainKeywords.join(", ")}.

  Please naturally incorporate these product-related keywords as well: ${keywords.join(", ")}.

  ${
    post.description
      ? `
  Additional Context from User:
  ${post.description}`
      : ""
  }

  ${
    Array.isArray(post.internalLinks) && post.internalLinks.length > 0
      ? `
  Important: This article should reference these related articles from our blog:
  ${post.internalLinks.map((link) => `- [${link.title}](${link.url})${link.description ? ` - ${link.description}` : ""}`).join("\n")}`
      : ""
  }

  Instructions:
  1. Use grade 5-6 level Canadian English
  2. Keep a warm, friendly tone like you're helping a fellow traveler
  3. Do NOT mention yourself or the writing process
  4. Do NOT say “this article” or “this blog”
  5. Create an SEO-friendly title (60–70 characters)
  6. Create a clear outline with 2–3 main sections
  7. Each section should include:
     - One H2 heading that’s relevant
     - 1–2 H3 subheadings underneath
     - If any of these affiliate products fit, feature them naturally:
       ${Array.isArray(post.affiliateLinks) ? post.affiliateLinks.map((link) => `- ${link.name}`).join("\n     ") : ""}

  Format your response as JSON:
  {
    "title": "Your Blog Post Title",
    "outline": [
      { 
        "heading": "First Main Section",
        "subheadings": ["Subheading 1", "Subheading 2"],
        "affiliate_connection": "Product name if section should feature it, or null"
      }
    ]
  }`;

    const outlineResponse = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 1000,
      temperature: 0.7,
      messages: [{ role: "user", content: outlinePrompt }],
    });

    const outlineText = extractTextFromResponse(outlineResponse);
    console.log("Outline response text:", outlineText);
    
    // Extract JSON from the response text
    const outlineJson =
      outlineText.match(/```json\s*([\s\S]*?)\s*```/) ||
      outlineText.match(/{[\s\S]*}/);
    
    if (!outlineJson) {
      console.error("No JSON found in outline response");
      throw new Error("Failed to extract JSON from outline response");
    }

    let outlineResult;
    try {
      let jsonStr = Array.isArray(outlineJson) ? outlineJson[1] || outlineJson[0] : outlineJson;

      jsonStr = jsonStr.replace(/```json|```/g, "").trim();

      // 🛠️ Clean invalid control characters
      jsonStr = jsonStr.replace(/[\u0000-\u001F\u007F]/g, "");

      outlineResult = JSON.parse(jsonStr);
      
      // Handle different response formats
      if (outlineResult.blogPost) {
        // If outline is nested under blogPost
        outlineResult = {
          title: outlineResult.title || outlineResult.blogPost.title,
          outline: outlineResult.blogPost.outline || []
        };
      } else if (!outlineResult.outline) {
        // Ensure we have a valid outline array
        outlineResult = {
          title: outlineResult.title || "Blog Post",
          outline: []
        };
      }

      // Validate the outline structure
      if (!Array.isArray(outlineResult.outline)) {
        outlineResult.outline = [];
      }
    } catch (e) {
      console.error("Failed to parse outline JSON:", e, outlineJson);
      outlineResult = {
        title: "Blog Post About " + keywords.join(", "),
        outline: [],
      };
    }

    // Generate a new excerpt from Claude
    const excerptPrompt = `In a happy, cheerful, and conversational tone write a catchy, 1-2 sentence excerpt for a blog post titled "${outlineResult.title}" that entices readers to continue reading.`;
    const excerptResponse = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 150,
      temperature: 0.7,
      messages: [{ role: "user", content: excerptPrompt }],
    });
    const postExcerpt = trimToCompleteSentence(extractTextFromResponse(excerptResponse));
    
    // Prepare affiliate links section if available
    let affiliateLinksMarkdown = "";
    if (Array.isArray(post.affiliateLinks) && post.affiliateLinks.length > 0) {
      const validAffiliateLinks = post.affiliateLinks.filter(
        (link) => link.name && link.url,
      );
      if (validAffiliateLinks.length > 0) {
        const categoryName = keywords[0] || "Resources";
        affiliateLinksMarkdown = `## Top ${validAffiliateLinks.length} ${categoryName} Recommendations\n\n`;
        validAffiliateLinks.forEach((link) => {
          affiliateLinksMarkdown += `* [${link.name}](${link.url})\n`;
        });
        affiliateLinksMarkdown += "\n";
      }
    }

    console.log("Step 2: Generating introduction...");
    const introPrompt = `Write an engaging introduction for "${outlineResult.title}".
Include:
- A hook that grabs attention
- Brief mention of key benefits readers will get
- Natural transition to the first section: "${outlineResult.outline[0]?.heading || "First Section"}"
Instructions:
1. Use grade 5-6 level Canadian English
2. Keep a cheerful, friendly tone — like you're chatting with a fellow traveler
3. - Make it helpful, warm, and down-to-earth
4. Keep emoji usage minimal - only if absolutely necessary
5. Include keywords naturally.
6. Give a clear overview of what readers will learn

- !Important: If you're running out of space, make sure to end at the previous sentence. Do NOT leave the content hanging or mid-thought. NO INCOMPLETE SENTENCES AT THE END OF THE SECTION.

Format your response:
[Your introduction here]`;

    const introResponse = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 500,
      temperature: 0.7,
      messages: [{ role: "user", content: introPrompt }],
    });

    let fullContent = "";

    // Add title
    fullContent += `# ${outlineResult.title}\n\n`;

    // Add the excerpt
    fullContent += `${postExcerpt}\n\n`;

    // Add affiliate links section right after the excerpt
    if (affiliateLinksMarkdown) {
      fullContent += affiliateLinksMarkdown;
    }

    // Then add the introduction
    let introContent = extractTextFromResponse(introResponse);
    introContent = trimToCompleteSentence(introContent);
    fullContent += introContent + "\n\n";

    // Create a map of affiliate links for easier reference
    const affiliateLinksMap = Array.isArray(post.affiliateLinks)
      ? post.affiliateLinks.reduce((acc, link) => {
          if (link.name && link.url) {
            acc[link.name] = link.url;
          }
          return acc;
        }, {})
      : {};

    // Track affiliate link usage count
    const affiliateLinkUsage = {};
    Object.keys(affiliateLinksMap).forEach((name) => {
      affiliateLinkUsage[name] = 0;
    });

    // Add internal links tracking similar to affiliate links
    const internalLinksUsage = {};
    if (Array.isArray(post.internalLinks)) {
      post.internalLinks.forEach((link) => {
        internalLinksUsage[link.url] = 0;
      });
    }

    // Updated Section Prompt: Minimal change to remove new post style greeting.
    for (const section of outlineResult.outline) {
      console.log("Generating content for section:", section.heading);

      // Create URL to product code mapping
      const urlToProductCode = affiliateLinks.reduce(
        (acc, link) => {
          if (link.url && link.productCode) {
            acc[link.url] = link.productCode;
          }
          return acc;
        },
        {} as Record<string, string>,
      );

      // Track usage by product code
      const productCodeUsage: Record<string, number> = {};
      Object.entries(urlToProductCode).forEach(([url, code]) => {
        productCodeUsage[code] = 0;
      });

      let affiliateInstructions = "";
      const link = affiliateLinks.find(
        (l) => l.name === section.affiliate_connection,
      );

      if (link && urlToProductCode[link.url]) {
        const url = link.url;
        const productCode = urlToProductCode[url];
        const remainingMentions = 1 - (productCodeUsage[productCode] || 0);

        affiliateInstructions = `
This section MUST clearly and naturally feature [${link.name}](${url}) as an H2 or H3 heading.
When mentioning this product in the content, ALWAYS use the markdown link format: [${link.name}](${url})
Do NOT mention this product more than ${remainingMentions} more times in this section.
Mention specific features or benefits naturally within the content.`;
      } else if (Object.keys(urlToProductCode).length > 0) {
        const availableLinks = affiliateLinks
          .filter(
            (link) => link.url && (productCodeUsage[link.productCode] || 0) < 2,
          )
          .map((link) => `- [${link.name}](${link.url})`);

        if (availableLinks.length > 0) {
          affiliateInstructions = `
When mentioning any of these products (ONLY if they haven't been used twice yet), ALWAYS use the proper markdown link format:
${availableLinks.join("\n")}

- Use them as H2 or H3 headings if naturally suitable
- Highlight their benefits clearly
- Ensure all product mentions use the proper markdown link format
- Each product can only be mentioned up to 2 times in total throughout the article`;
        }
      }

      // Minimal change: Replace the original greeting with a "continue" instruction.
      const sectionPrompt = `You're continuing a blog post titled "${outlineResult.title}". Write the next section titled "${section.heading}".
Instructions:
1. Use grade 5-6 level Canadian English.
2. Keep the tone consistent as the introdut
3. Write as if you're continuing the same blog—not starting a new one
4. Focus on providing valuable information.
5. Keep emoji usage minimal.
6. Do NOT summarize what’s already been covered

- !Important: If you're running out of space, make sure to end at the previous sentence. Do NOT leave the content hanging or mid-thought. NO INCOMPLETE SENTENCES AT THE END OF THE SECTION.

${affiliateInstructions}

${
  post.description
    ? `
Important: Review this context from the user and naturally incorporate any URLs or specific instructions:
${post.description}`
    : ""
}

${
  Array.isArray(post.internalLinks) && post.internalLinks.length > 0
    ? `
Important: Consider including these relevant internal links where appropriate:
${post.internalLinks
  .filter((link) => !internalLinksUsage[link.url])
  .map(
    (link) =>
      `- [${link.title}](${link.url})${link.description ? ` - ${link.description}` : ""}`,
  )
  .join("\n")}

- Each internal link should only be used once.
- Place them naturally where they add value to the content.
- Present them as "related reading" or "learn more" references.`
    : ""
}

Also create content for these subheadings:
${section.subheadings.map((subheading) => `- ## ${subheading}`).join("\n")}

Each subheading section should be 100-200 words with specific, useful information related to the subheading topic.

Format with proper markdown:

## ${section.heading}

[Content for main section]

${section.subheadings.map((subheading) => `### ${subheading}\n\n[Content for this subheading]`).join("\n\n")}`;

      const sectionResponse = await client.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 700,
        temperature: 0.7,
        messages: [{ role: "user", content: sectionPrompt }],
      });

      let sectionContent = extractTextFromResponse(sectionResponse);
      sectionContent = trimToCompleteSentence(sectionContent);
      fullContent += sectionContent + "\n\n";

      // Track usage by product code for this section
      Object.entries(urlToProductCode).forEach(([url, code]) => {
        const matches = sectionContent.match(
          new RegExp(
            `\\[.*?\\]\\(${url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\)`,
            "g",
          ),
        );
        productCodeUsage[code] = (matches || []).length;
      });

      // Count affiliate link usage in this section
      Object.keys(affiliateLinksMap).forEach((name) => {
        const regex = new RegExp(
          `\\[${name}\\]\\(${affiliateLinksMap[name]}\\)`,
          "g",
        );
        const matches = sectionContent.match(regex);
        if (matches) {
          affiliateLinkUsage[name] =
            (affiliateLinkUsage[name] || 0) + matches.length;
        }
      });

      // Track and filter internal links
      Object.keys(internalLinksUsage).forEach((url) => {
        const regex = new RegExp(`\\[.*?\\]\\(${url}\\)`, "g");
        const matches = sectionContent.match(regex);
        if (matches) {
          internalLinksUsage[url] =
            (internalLinksUsage[url] || 0) + matches.length;
          // If link is used more than once, remove subsequent occurrences
          if (internalLinksUsage[url] > 1) {
            const allMatches = [...sectionContent.matchAll(regex)];
            // Keep first occurrence, remove others
            for (let i = 1; i < allMatches.length; i++) {
              sectionContent = sectionContent.replace(allMatches[i][0], "");
            }
          }
        }
      });
    }

    console.log("Step 4: Generating conclusion...");
    const conclusionPrompt = `You're wrapping up the blog post titled "${outlineResult.title}".

    Instructions:
    1. Use grade 5-6 level Canadian English.
    2. Keep the tone consistent with the rest of the article.
    3. Summarize key points without repeating entire sections.
    4. Only include factual information. Do not make up any details.
    5. Do NOT include any affiliate links in the conclusion.

- !Important: If you're running out of space, make sure to end at the previous sentence. Do NOT leave the content hanging or mid-thought. NO INCOMPLETE SENTENCES AT THE END OF THE SECTION.

    Now, write a conclusion  for the blog post about ${keywords.join(", ")}.

    Include:
    - A quick recap of what was covered
    - A personal reflection or takeaway only if it makes sense naturally—don't force it.

    Use proper markdown:

## Wrapping Up

[Your conclusion here]`;

    const conclusionResponse = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 500,
      temperature: 0.7,
      messages: [{ role: "user", content: conclusionPrompt }],
    });

    let conclusionContent = extractTextFromResponse(conclusionResponse);
    conclusionContent = trimToCompleteSentence(conclusionContent);
    fullContent += conclusionContent;

    // Images will be handled by the MarkdownRenderer component based on affiliate link placement

    // Calculate word count
    const wordCount = fullContent.split(/\s+/).length;
    console.log(`Generated content with ${wordCount} words`);

    // Extract description if not provided
    let finalDescription = description;
    if (!finalDescription) {
      finalDescription =
        fullContent.split("\n").slice(2, 4).join(" ").slice(0, 155) + "...";
    }

    return {
      content: fullContent,
      title: outlineResult.title,
      description: finalDescription,
      images: affiliateImages, // Return images with product codes
    };
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
}

export async function checkScheduledPosts() {
  try {
    // First check if we're in test mode
    const settings = await storage.getSettings();
    console.log(`Current test mode status: ${settings.test_mode}`);

    // Get all scheduled posts where the date is in the past and content hasn't been generated yet
    const posts = await storage.getAllBlogPosts();

    // Filter for posts that need processing (scheduled or draft with scheduledDate in the past and content is empty)
    const now = new Date();

    const postsToProcess = posts.filter((post) => {
      return (
        (post.status === "scheduled" || post.status === "draft") &&
        post.scheduledDate &&
        new Date(post.scheduledDate) <= now &&
        (!post.content || post.content.length < 100)
      );
    });

    console.log(`Found ${postsToProcess.length} posts to process`);

    // Process each post one by one
    for (const post of postsToProcess) {
      console.log(`Processing post ID ${post.id}: ${post.keywords.join(", ")}`);

      try {
        // Generate content using Anthropic
        const generated = await generateContent(
          post.keywords,
          post.description || "",
          post,
          post.secondaryKeywords || [],
        );

        // Update the post with generated content and images
        console.log("Saving images with product codes:", generated.images);
        const updatedPost = await storage.updateBlogPost(post.id, {
          title: generated.title,
          content: generated.content,
          description: generated.description,
          status: settings.test_mode ? "draft" : "published", // Keep as draft in test mode
          publishedDate: settings.test_mode ? null : new Date(), // Only set published date if not in test mode
          affiliateImages: generated.images, // Store the crawled images
        });

        console.log(
          `Successfully generated content for post ID ${post.id}. Status: ${settings.test_mode ? "draft (test mode)" : "published"}`,
        );

        // WordPress publishing is disabled in test mode
        if (
          !settings.test_mode &&
          process.env.WORDPRESS_API_URL &&
          process.env.WORDPRESS_AUTH_TOKEN &&
          process.env.WORDPRESS_USERNAME
        ) {
          console.log(
            `Test mode is OFF - attempting to publish post ID ${post.id} to WordPress...`,
          );

          try {
            // Create Basic Auth token from username and application password
            const authToken = Buffer.from(
              `${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_AUTH_TOKEN}`,
            ).toString("base64");

            const apiUrl = process.env.WORDPRESS_API_URL;
            const endpoint = apiUrl.endsWith("/wp-json")
              ? `${apiUrl}/wp/v2/posts`
              : `${apiUrl}/wp/v2/posts`;

            let featuredImageId = null;
            if (
              updatedPost.affiliateImages &&
              updatedPost.affiliateImages.length > 0
            ) {
              try {
                featuredImageId = await uploadImageToWordPress(
                  updatedPost.affiliateImages[0].url,
                );
                console.log(
                  "✅ Uploaded featured image. Media ID:",
                  featuredImageId,
                );
              } catch (error) {
                console.warn("⚠️ Failed to upload featured image:", error);
              }
            }

            // Use the updatedPost data for WordPress
            const postData = {
              title: { raw: updatedPost.title },
              content: {
                raw: convertMarkdownToHTML(
                  updatedPost.content,
                  updatedPost.affiliateImages || [],
                ),
              },
              status: "publish",
              excerpt: { raw: updatedPost.description || "" },
              meta: {
                _yoast_wpseo_metadesc: updatedPost.seoDescription || "",
                _yoast_wpseo_title: updatedPost.seoTitle || "",
              },
              ...(featuredImageId ? { featured_media: featuredImageId } : {}),
            };

            console.log(`Publishing to WordPress endpoint: ${endpoint}`);

            const response = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Basic ${authToken}`,
                Accept: "application/json",
              },
              body: JSON.stringify(postData),
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(
                `WordPress API error: ${response.statusText} - ${errorText}`,
              );
            }

            const result = await response.json();
            console.log(
              `✅ Successfully published post ID ${post.id} to WordPress: ${result.link}`,
            );

            // Update the post with WordPress URL
            if (result.link) {
              await storage.updateBlogPost(post.id, {
                wordpressUrl: result.link,
              });
            }
          } catch (wpError) {
            console.error(
              `❌ Error publishing post ID ${post.id} to WordPress:`,
              wpError,
            );
            // We continue processing other posts even if WordPress publishing fails
          }
        } else {
          console.log(
            `⚠️ Test mode is ON or WordPress credentials not configured. Post ID ${post.id} was generated but NOT published to WordPress.`,
          );
        }
      } catch (error) {
        console.error(`Error processing post ID ${post.id}:`, error);
      }
    }
  } catch (error) {
    console.error("Error in scheduler:", error);
  }

  // Schedule the next check (every 2 minutes)
  setTimeout(checkScheduledPosts, 120000);
}

// The scheduler will be initialized from routes.ts
console.log("✅ Scheduler module loaded and ready");
