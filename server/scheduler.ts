import { Anthropic } from "@anthropic-ai/sdk";
import { storage } from "./storage";
import { BlogPost } from "@shared/schema";
import { crawlAffiliateLink, matchImagesWithHeadings, insertImagesIntoContent } from "./services/image-crawler";
import { createHash } from 'crypto';

// Create an Anthropic client
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const ANTHROPIC_MODEL = "claude-3-7-sonnet-20250219";

function convertMarkdownToHTML(content: string): string {
  // Convert headings, but skip h1 as it's reserved for the title
  content = content.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  content = content.replace(/^### (.+)$/gm, '<h3>$1</h3>');

  // Convert images
  content = content.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">');

  // Convert links - matches [text](url) pattern
  content = content.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Convert paragraphs - add proper spacing
  content = content.split('\n\n').map(para => {
    if (!para.trim()) return '';
    if (para.startsWith('<h') || para.startsWith('<img') || para.startsWith('<ul') || para.startsWith('<ol')) {
      return para;
    }
    return `<p>${para}</p>`;
  }).join('\n\n');

  return content;
}

async function generateContent(keywords: string[], description: string = "", post: any = {}): Promise<{
  content: string;
  title: string;
  description: string;
  images: any[];
}> {
  try {
    console.log(`[Content Generation] Starting content generation for keywords: ${keywords.join(", ")}`);

    console.log("Step 1: Generating title and outline...");
    const outlinePrompt = `You are a happy and cheerful woman who lives in Canada and works as an SEO content writer. Write a blog post about: ${keywords.join(", ")}.

${post.description ? `
Additional Context from User:
${post.description}` : ""}

${Array.isArray(post.internalLinks) && post.internalLinks.length > 0 ? `
Important: This article should reference these related articles from our blog:
${post.internalLinks.map(link => `- [${link.title}](${link.url})${link.description ? ` - ${link.description}` : ''}`).join('\n')}` : ""}

Instructions:
1. Write in grade 5-6 level Canadian English
2. Create an engaging but SEO-friendly title (60-70 characters)
3. Create a detailed outline with 4-6 main sections
4. For each section, include:
   - A clear H2 heading that's topically relevant
   - 2-3 H3 subheadings under each main section
   - If any of these affiliate products/resources fit naturally as section topics, use them:
     ${Array.isArray(post.affiliateLinks) ? post.affiliateLinks.map(link => `- ${link.name}`).join('\n     ') : ''}

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
      max_tokens: 4000,
      temperature: 0.7,
      messages: [{ role: "user", content: outlinePrompt }]
    });

    const outlineText = outlineResponse.content[0].text;
    const outlineJson = outlineText.match(/```json\s*([\s\S]*?)\s*```/) || outlineText.match(/{[\s\S]*}/);
    let outlineResult;

    if (outlineJson) {
      try {
        outlineResult = JSON.parse(outlineJson[0].replace(/```json|```/g, '').trim());
      } catch (e) {
        console.error("Failed to parse outline JSON:", e);
        outlineResult = { title: "Blog Post About " + keywords.join(", "), outline: [] };
      }
    } else {
      console.error("Could not extract JSON from outline response");
      outlineResult = { title: "Blog Post About " + keywords.join(", "), outline: [] };
    }

    // Prepare affiliate links section if available
    let affiliateLinksMarkdown = "";
    if (Array.isArray(post.affiliateLinks) && post.affiliateLinks.length > 0) {
      const validAffiliateLinks = post.affiliateLinks.filter(link => link.name && link.url);
      if (validAffiliateLinks.length > 0) {
        const categoryName = keywords[0] || "Resources";
        affiliateLinksMarkdown = `## Top ${validAffiliateLinks.length} ${categoryName} Recommendations\n\n`;
        validAffiliateLinks.forEach(link => {
          affiliateLinksMarkdown += `* [${link.name}](${link.url})\n`;
        });
        affiliateLinksMarkdown += "\n";
      }
    }

    console.log("Step 2: Generating introduction...");
    const introPrompt = `You are a happy and cheerful woman who lives in Canada and works as an SEO content writer. Write about: ${keywords.join(", ")}.
Instructions:
1. Use grade 5-6 level Canadian English
2. Write in a professional but friendly tone
3. Keep emoji usage minimal - only if absolutely necessary
4. Include keywords naturally
5. Give a clear overview of what readers will learn

${post.description ? `
Important: Review this context from the user and incorporate any URLs or specific instructions:
${post.description}` : ""}

Write an engaging introduction (150-200 words) for "${outlineResult.title}".
Include:
- A hook that grabs attention
- Brief mention of key benefits readers will get
- Natural transition to the first section: "${outlineResult.outline[0]?.heading || 'First Section'}"

Format your response:
${outlineResult.title}

[Your introduction here]`;

    const introResponse = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4000,
      temperature: 0.7,
      messages: [{ role: "user", content: introPrompt }]
    });

    let fullContent = "";

    // Add affiliate links section right after intro if available
    if (affiliateLinksMarkdown) {
      fullContent += affiliateLinksMarkdown;
    }

    fullContent += introResponse.content[0].text + "\n\n";

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
    Object.keys(affiliateLinksMap).forEach(name => {
      affiliateLinkUsage[name] = 0;
    });

    // Add internal links tracking similar to affiliate links
    const internalLinksUsage = {};
    if (Array.isArray(post.internalLinks)) {
      post.internalLinks.forEach(link => {
        internalLinksUsage[link.url] = 0;
      });
    }

    for (const section of outlineResult.outline) {
      console.log("Generating content for section:", section.heading);

      let affiliateInstructions = "";
      if (section.affiliate_connection && affiliateLinksMap[section.affiliate_connection]) {
        affiliateInstructions = `
This section MUST clearly and naturally feature [${section.affiliate_connection}](${affiliateLinksMap[section.affiliate_connection]}) as an H2 or H3 heading.
When mentioning this product in the content, ALWAYS use the markdown link format: [${section.affiliate_connection}](${affiliateLinksMap[section.affiliate_connection]})
Do NOT mention this product more than ${2 - (affiliateLinkUsage[section.affiliate_connection] || 0)} more times in this section.
Mention specific features or benefits naturally within the content.`;
      } else if (Object.keys(affiliateLinksMap).length > 0) {
        const availableLinks = Object.entries(affiliateLinksMap)
          .filter(([name]) => (affiliateLinkUsage[name] || 0) < 2)
          .map(([name, url]) => `- [${name}](${url})`);

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

      const sectionPrompt = `You are a happy and cheerful woman who lives in Canada and works as an SEO content writer. Write about: ${keywords.join(", ")}.
Instructions:
1. Use grade 5-6 level Canadian English
2. Write naturally and conversationally
3. Focus on providing valuable information
4. Keep emoji usage minimal
${affiliateInstructions}

${post.description ? `
Important: Review this context from the user and naturally incorporate any URLs or specific instructions:
${post.description}` : ""}

${Array.isArray(post.internalLinks) && post.internalLinks.length > 0 ? `
Important: Consider including these relevant internal links where appropriate:
${post.internalLinks
  .filter(link => !internalLinksUsage[link.url]) // Only show unused links
  .map(link => `- [${link.title}](${link.url})${link.description ? ` - ${link.description}` : ''}`)
  .join('\n')}

- Each internal link should only be used once
- Place them naturally where they add value to the content
- Present them as "related reading" or "learn more" references` : ""}

Write a detailed section (200-300 words) for "${section.heading}" that's part of "${outlineResult.title}".
Focus on providing valuable information and real experiences, using keywords only where they naturally fit into the narrative. Prioritize reader engagement over keyword placement.

Also create content for these subheadings:
${section.subheadings.map(subheading => `- ## ${subheading}`).join('\n')}

Each subheading section should be 100-150 words with specific, useful information.

Format with proper markdown:

## ${section.heading}

[Main section content]

${section.subheadings.map(subheading => `### ${subheading}\n\n[Subheading content]`).join('\n\n')}`;

      const sectionResponse = await client.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 4000,
        temperature: 0.7,
        messages: [{ role: "user", content: sectionPrompt }]
      });

      const sectionContent = sectionResponse.content[0].text;

      // Count affiliate link usage in this section
      Object.keys(affiliateLinksMap).forEach(name => {
        const regex = new RegExp(`\\[${name}\\]\\(${affiliateLinksMap[name]}\\)`, 'g');
        const matches = sectionContent.match(regex);
        if (matches) {
          affiliateLinkUsage[name] = (affiliateLinkUsage[name] || 0) + matches.length;
        }
      });

      // Track internal link usage similar to affiliate links
      Object.keys(internalLinksUsage).forEach(url => {
        const regex = new RegExp(`\\[.*?\\]\\(${url}\\)`, 'g');
        const matches = sectionContent.match(regex);
        if (matches) {
          internalLinksUsage[url] = (internalLinksUsage[url] || 0) + matches.length;
        }
      });

      fullContent += sectionContent + "\n\n";
    }

    console.log("Step 4: Generating conclusion...");
    const conclusionPrompt = `You are a happy and cheerful woman who lives in Canada and works as an SEO content writer. 

Instructions:
1. Use grade 5-6 level Canadian English
2. Keep the tone professional but warm
3. Avoid emoji usage

Write a conclusion (150-200 words) for "${outlineResult.title}" about ${keywords.join(", ")}.
Include:
- Summary of key points
- Value provided to the reader
- Call to action that encourages trying the recommendations

When mentioning any products, use these markdown links:
${Object.entries(affiliateLinksMap)
  .filter(([name]) => (affiliateLinkUsage[name] || 0) < 2)
  .map(([name, url]) => `- [${name}](${url})`)
  .join("\n")}

Use proper markdown:

## Final Thoughts

[Your conclusion here]`;

    const conclusionResponse = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4000,
      temperature: 0.7,
      messages: [{ role: "user", content: conclusionPrompt }]
    });

    fullContent += conclusionResponse.content[0].text;

    // After content generation, crawl affiliate links and add images
    console.log("Crawling affiliate links for images...");
    let images = [];

    if (Array.isArray(post.affiliateLinks)) {
      try {
        images = await matchImagesWithHeadings(fullContent, post.affiliateLinks);
        fullContent = insertImagesIntoContent(fullContent, images);
        console.log(`Added ${images.length} affiliate product images to the content`);
      } catch (error) {
        console.error("Error processing affiliate images:", error);
      }
    }

    // Calculate word count
    const wordCount = fullContent.split(/\s+/).length;
    console.log(`Generated content with ${wordCount} words`);

    // Extract description if not provided
    let finalDescription = description;
    if (!finalDescription) {
      finalDescription = fullContent.split("\n").slice(2, 4).join(" ").slice(0, 155) + "...";
    }

    // Add content hash logging
    const contentHash = createHash('sha256').update(fullContent).digest('hex').substring(0, 8);
    console.log(`[Content Generation] Generated content with hash: ${contentHash}`);

    return {
      content: fullContent,
      title: outlineResult.title,
      description: finalDescription,
      images
    };
  } catch (error) {
    console.error("[Content Generation] Error:", error);
    throw error;
  }
}

async function checkScheduledPosts() {
  console.log("[Scheduler] Checking for scheduled posts at " + new Date().toLocaleString());
  const now = new Date();

  try {
    const settings = await storage.getSettings();
    console.log(`[Scheduler] Current test mode status: ${settings.test_mode}`);

    const posts = await storage.getAllBlogPosts();
    const postsToProcess = posts.filter(post => {
      return (
        (post.status === "scheduled" || post.status === "draft") &&
        post.scheduledDate &&
        new Date(post.scheduledDate) <= now &&
        (!post.content || post.content.length < 100)
      );
    });

    console.log(`[Scheduler] Found ${postsToProcess.length} posts to process`);

    for (const post of postsToProcess) {
      console.log(`[Scheduler] Processing post ID ${post.id}: ${post.keywords.join(", ")}`);

      try {
        // Generate content only if it doesn't exist
        if (!post.content || post.content.length < 100) {
          console.log(`[Scheduler] Generating content for post ID ${post.id}`);
          const generated = await generateContent(
            post.keywords, 
            post.description || "",
            post
          );

          // Log content hash before storing
          const contentHash = createHash('sha256').update(generated.content).digest('hex').substring(0, 8);
          console.log(`[Scheduler] Storing generated content with hash: ${contentHash}`);

          // Update the post with generated content and images
          await storage.updateBlogPost(post.id, {
            title: generated.title,
            content: generated.content,
            description: generated.description,
            status: settings.test_mode ? "draft" : "ready_to_publish",
            affiliateImages: generated.images,
          });

          console.log(`[Scheduler] Successfully stored content for post ID ${post.id}`);
        } else {
          console.log(`[Scheduler] Post ID ${post.id} already has content, skipping generation`);
        }

        // Publish to WordPress if not in test mode and post is ready
        if (!settings.test_mode && post.status === "ready_to_publish") {
          console.log(`[Scheduler] Publishing post ID ${post.id} to WordPress...`);

          if (process.env.WORDPRESS_API_URL && process.env.WORDPRESS_AUTH_TOKEN && process.env.WORDPRESS_USERNAME) {
            try {
              const authToken = Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_AUTH_TOKEN}`).toString('base64');
              const apiUrl = process.env.WORDPRESS_API_URL;
              const endpoint = apiUrl.endsWith('/wp-json') ? `${apiUrl}/wp/v2/posts` : `${apiUrl}/wp/v2/posts`;

              // Convert markdown to HTML
              const htmlContent = convertMarkdownToHTML(post.content);

              const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Basic ${authToken}`,
                  'Accept': 'application/json'
                },
                body: JSON.stringify({
                  title: { raw: post.title },
                  content: { raw: htmlContent },
                  status: 'publish',
                  excerpt: { raw: post.excerpt || '' },
                  meta: {
                    _yoast_wpseo_metadesc: post.seoDescription || '',
                    _yoast_wpseo_title: post.seoTitle || '',
                  }
                })
              });

              if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`WordPress API error: ${response.statusText} - ${errorText}`);
              }

              const result = await response.json();
              console.log(`[Scheduler] Successfully published post ID ${post.id} to WordPress: ${result.link}`);

              // Update the post with WordPress URL
              await storage.updateBlogPost(post.id, {
                status: "published",
                wordpressUrl: result.link || `${apiUrl.replace('/wp-json', '')}/?p=${result.id}`
              });
            } catch (wpError) {
              console.error(`[Scheduler] Error publishing post ID ${post.id} to WordPress:`, wpError);
            }
          }
        }
      } catch (error) {
        console.error(`[Scheduler] Error processing post ID ${post.id}:`, error);
      }
    }
  } catch (error) {
    console.error("[Scheduler] Error:", error);
  }

  setTimeout(checkScheduledPosts, 120000);
}

// Export the scheduler function
export { checkScheduledPosts };

console.log("✅ Scheduler module loaded and ready");