import { Anthropic } from "@anthropic-ai/sdk";
import { storage } from "./storage";
import { BlogPost } from "@shared/schema";
import { crawlAffiliateLink, matchImagesWithHeadings, insertImagesIntoContent } from "./services/image-crawler";
import { searchViatorProducts, getViatorAffiliateUrl } from './services/viator-search';

// Create an Anthropic client
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const ANTHROPIC_MODEL = "claude-3-7-sonnet-20250219";

// Add a function to convert markdown to HTML
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

async function findRelevantPosts(keyword: string, posts: BlogPost[], limit: number = 3): Promise<any[]> {
  const keywordWords = keyword.toLowerCase().split(/\s+/);
  return posts
    .filter(post => post.status === "published" && post.wordpressUrl)
    .map(post => ({
      post,
      relevance: keywordWords.reduce((score, word) => 
        score + (post.title.toLowerCase().includes(word) ? 1 : 0) +
        (post.keywords.some(k => k.toLowerCase().includes(word)) ? 0.5 : 0), 0)
    }))
    .filter(({relevance}) => relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, limit)
    .map(({post}) => ({
      title: post.title,
      url: post.wordpressUrl,
      description: post.description
    }));
}

async function generateContent(keywords: string[], description: string = "", post: any = {}): Promise<{
  content: string;
  title: string;
  description: string;
  images: any[];
}> {
  // Search for relevant Viator products
  const viatorProducts = await searchViatorProducts(keywords.join(' '), 10);
  const affiliateLinks = await Promise.all(
    viatorProducts.map(async product => ({
      name: product.title,
      url: await getViatorAffiliateUrl(product.productCode) || '',
      description: product.description
    }))
  );

  // Filter out products where we couldn't get affiliate URLs
  const validAffiliateLinks = affiliateLinks.filter(link => link.url);

  // Find relevant internal links
  const allPosts = await storage.getAllBlogPosts();
  const internalLinks = await findRelevantPosts(keywords.join(' '), allPosts);

  // Add the found links to the post object
  post.affiliateLinks = validAffiliateLinks;
  post.internalLinks = internalLinks;

  try {
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

    return {
      content: fullContent,
      title: outlineResult.title,
      description: finalDescription,
      images, // Return images so they can be stored in the database
    };
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
}

async function generateContentOriginal(keywords: string[], description: string = "", post: any = {}): Promise<{
  content: string;
  title: string;
  description: string;
}> {
  try {
    console.log("Step 1: Generating title and outline...");
    const outlinePrompt = `You are a happy and cheerful woman who lives in Canada and works as an SEO content writer. You need to write a blog post about: ${keywords.join(", ")}.
- Use grade 5-6 level Canadian English for all content. 
- Only include factual information. Do not make up any details.

Instructions:
1. Create an engaging but SEO-friendly title for the blog post (60-70 characters)
2. Create an outline with 4-6 main sections. For each section, provide:
   - A clear heading that's topically relevant
   - Under each section heading, create 2-3 level-2 sub headings

Format your response as JSON with this structure:
{
  "title": "Your Blog Post Title",
  "outline": [
    { "heading": "First Main Section Heading", "subheadings": ["Subheading 1", "Subheading 2"] },
    { "heading": "Second Main Section Heading", "subheadings": ["Subheading 1", "Subheading 2"] }
  ]
}
Ensure JSON is properly formatted with no trailing commas.`;

    const outlineResponse = await client.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 4000,
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content: outlinePrompt
        }
      ]
    });

    // Parse the outline result from the JSON response
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

    // Prepare affiliate links section
    let affiliateLinksMarkdown = "";
    if (Array.isArray(post.affiliateLinks) && post.affiliateLinks.length > 0) {
      const validAffiliateLinks = post.affiliateLinks.filter(link => link.name && link.url);
      if (validAffiliateLinks.length > 0) {
        affiliateLinksMarkdown = "\n\n## Recommended Resources\n\n";
        validAffiliateLinks.forEach(link => {
          affiliateLinksMarkdown += `* [${link.name}](${link.url})\n`;
        });
        affiliateLinksMarkdown += "\n";
      }
    }

    console.log("Step 2: Generating introduction...");
    const introPrompt = `You are a happy and cheerful woman who lives in Canada and works as an SEO content writer. Write about: ${keywords.join(", ")}.
- Use grade 5-6 level Canadian English. 
- Use a casual, friendly tone like you're talking to a friend.
- Only include factual information. Do not make up any details.

Write an engaging introduction (150-200 words) for a blog post titled "${outlineResult.title}". 
The introduction should:
- Hook the reader with something interesting
- Include the keywords naturally
- Give an overview of what the article will cover
- End with a transition to the first section: "${outlineResult.outline[0]?.heading || 'First Section'}"

Format your response as markdown, starting directly with the content:
[Your introduction here]`;

    const introResponse = await client.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 4000,
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content: introPrompt
        }
      ]
    });

    const introResult = {
      introduction: introResponse.content[0].text
    };

    // Insert the affiliate links right after the title
    let fullContent = introResult.introduction;
    if (affiliateLinksMarkdown) {
      // Find the position after the title
      const titleEndIndex = fullContent.indexOf('\n\n');
      if (titleEndIndex !== -1) {
        fullContent = fullContent.substring(0, titleEndIndex + 2) + 
                      affiliateLinksMarkdown + 
                      fullContent.substring(titleEndIndex + 2);
      } else {
        fullContent += affiliateLinksMarkdown;
      }
    }


    fullContent += "\n\n";

    // Track the number of times each affiliate link has been used - we'll still reference them in the content
    const affiliateLinkUsage = {};

    for (const section of outlineResult.outline.slice(0, Math.min(outlineResult.outline.length, 10))) {
      console.log("Generating content for section:", section.heading);

      // Prepare affiliate links instruction
      let affiliateLinksInstruction = "";
      if (Array.isArray(post.affiliateLinks) && post.affiliateLinks.length > 0) {
        // Filter out empty links
        const validAffiliateLinks = post.affiliateLinks.filter(link => link.name && link.url);

        if (validAffiliateLinks.length > 0) {
          affiliateLinksInstruction = `
- Important: Mention these products/resources naturally in your content where relevant:
${validAffiliateLinks.map(link => {
  // Initialize usage counter if not exists
  if (!affiliateLinkUsage[link.url]) {
    affiliateLinkUsage[link.url] = 0;
  }

  // Only include mentions of links that haven't been referenced twice yet
  if (affiliateLinkUsage[link.url] < 2) {
    affiliateLinkUsage[link.url]++;
    return `  - ${link.name}`;
  }
  return null;
}).filter(Boolean).join('\n')}
- Note: Do NOT include the links in your response. Only mention the names naturally within the content.
- The links are already listed at the beginning of the post.`;
        }
      }

      const sectionPrompt = `You are a happy and cheerful woman who lives in Canada and works as an SEO content writer. Write about: ${keywords.join(", ")}.
- Use grade 5-6 level Canadian English. 
- Vary sentence lengths and structure to mimic human writing
- Write in a casual, friendly tone like you're talking to a friend. Use simple words that everyone can understand.
- Only include factual information. Do not make up any details.
${affiliateLinksInstruction}

Write a detailed section (200-300 words) for the heading "${section.heading}" that's part of an article titled "${outlineResult.title}".
Include rich details, examples, personal anecdotes, and naturally place affiliate links where relevant.

Also create content for these subheadings:
${section.subheadings.map(subheading => `- ## ${subheading}`).join('\n')}

Each subheading section should be 100-150 words and provide specific, useful information related to the subheading topic.

Format your response with proper markdown headings:

## ${section.heading}

[Content for main section]

${section.subheadings.map(subheading => `### ${subheading}\n\n[Content for this subheading]`).join('\n\n')}`;

      const sectionResponse = await client.messages.create({
        model: "claude-3-opus-20240229",
        max_tokens: 4000,
        temperature: 0.7,
        messages: [
          {
            role: "user",
            content: sectionPrompt
          }
        ]
      });

      fullContent += sectionResponse.content[0].text + "\n\n";
    }

    console.log("Step 4: Generating conclusion...");
    const conclusionPrompt = `You are a happy and cheerful woman who lives in Canada and works as an SEO content writer. 
- Use grade 5-6 level Canadian English. 
- Use a casual, friendly tone like you're talking to a friend.
- Only include factual information. Do not make up any details.

Write a conclusion (150-200 words) for a blog post titled "${outlineResult.title}" about ${keywords.join(", ")}.
The conclusion should:
- Summarize the key points from the article
- Include a personal reflection or takeaway
- End with a call to action or question for the reader

Use proper markdown:

## Wrapping Up

[Your conclusion here]`;

    const conclusionResponse = await client.messages.create({
      model: "claude-3-opus-20240229",
      max_tokens: 4000,
      temperature: 0.7,
      messages: [
        {
          role: "user",
          content: conclusionPrompt
        }
      ]
    });

    fullContent += conclusionResponse.content[0].text;

    // Calculate word count
    const wordCount = fullContent.split(/\s+/).length;
    console.log(`Generated content with ${wordCount} words`);

    // Extract description if not provided
    let finalDescription = description;
    if (!finalDescription) {
      finalDescription = fullContent.split("\n").slice(2, 4).join(" ").slice(0, 155) + "...";
    }

    return {
      content: fullContent,
      title: outlineResult.title,
      description: finalDescription
    };
  } catch (error) {
    console.error("Error generating content:", error);
    throw error;
  }
}

export async function checkScheduledPosts() {
  console.log("Checking for scheduled posts at " + new Date().toLocaleString());
  const now = new Date();

  try {
    // First check if we're in test mode
    const settings = await storage.getSettings();
    console.log(`Current test mode status: ${settings.test_mode}`);

    // Get all scheduled posts where the date is in the past and content hasn't been generated yet
    const posts = await storage.getAllBlogPosts();

    // Filter for posts that need processing (scheduled or draft with scheduledDate in the past and content is empty)
    const postsToProcess = posts.filter(post => {
      return (
        (post.status === "scheduled" || post.status === "draft") &&
        post.scheduledDate &&
        new Date(post.scheduledDate) <= now &&
        (!post.content || post.content.length < 100) // Only generate if content is empty or very short
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
          post
        );

        // Update the post with generated content and images
        const updatedPost = await storage.updateBlogPost(post.id, {
          title: generated.title,
          content: generated.content,
          description: generated.description,
          status: settings.test_mode ? "draft" : "published", // Keep as draft in test mode
          publishedDate: settings.test_mode ? null : new Date(), // Only set published date if not in test mode
          affiliateImages: generated.images, // Store the crawled images
        });

        console.log(`Successfully generated content for post ID ${post.id}. Status: ${settings.test_mode ? 'draft (test mode)' : 'published'}`);

        // WordPress publishing is disabled in test mode
        if (!settings.test_mode && process.env.WORDPRESS_API_URL && process.env.WORDPRESS_AUTH_TOKEN && process.env.WORDPRESS_USERNAME) {
          console.log(`Test mode is OFF - attempting to publish post ID ${post.id} to WordPress...`);

          try {
            // Create Basic Auth token from username and application password
            const authToken = Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_AUTH_TOKEN}`).toString('base64');

            const apiUrl = process.env.WORDPRESS_API_URL;
            const endpoint = apiUrl.endsWith('/wp-json') ? `${apiUrl}/wp/v2/posts` : `${apiUrl}/wp/v2/posts`;

            // Use the updatedPost data for WordPress
            const postData = {
              title: { raw: updatedPost.title },
              content: { 
                raw: convertMarkdownToHTML(updatedPost.content)
              },
              status: 'publish',
              excerpt: { raw: updatedPost.description || '' },
              meta: {
                _yoast_wpseo_metadesc: updatedPost.seoDescription || '',
                _yoast_wpseo_title: updatedPost.seoTitle || '',
              }
            };

            console.log(`Publishing to WordPress endpoint: ${endpoint}`);

            const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${authToken}`,
                'Accept': 'application/json'
              },
              body: JSON.stringify(postData)
            });

            if (!response.ok) {
              const errorText = await response.text();
              throw new Error(`WordPress API error: ${response.statusText} - ${errorText}`);
            }

            const result = await response.json();
            console.log(`✅ Successfully published post ID ${post.id} to WordPress: ${result.link}`);

            // Update the post with WordPress URL
            if (result.link) {
              await storage.updateBlogPost(post.id, {
                wordpressUrl: result.link
              });
            }
          } catch (wpError) {
            console.error(`❌ Error publishing post ID ${post.id} to WordPress:`, wpError);
            // We continue processing other posts even if WordPress publishing fails
          }
        } else {
          console.log(`⚠️ Test mode is ON or WordPress credentials not configured. Post ID ${post.id} was generated but NOT published to WordPress.`);
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