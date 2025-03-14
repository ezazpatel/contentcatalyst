import { Anthropic } from "@anthropic-ai/sdk";
import { storage } from "./storage";
import { BlogPost } from "@shared/schema";

// Create an Anthropic client
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const ANTHROPIC_MODEL = "claude-3-7-sonnet-20250219";

async function generateContent(keywords: string[], description: string = "", post: any = {}): Promise<{
  content: string;
  title: string;
  description: string;
}> {
  try {
    console.log("Step 1: Generating title and outline...");
    const outlinePrompt = `You are a happy and cheerful woman who lives in Canada and works as an SEO content writer. You need to write a blog post about: ${keywords.join(", ")}.
21:
22:${post.description ? `Additional Context from User: ${post.description}
23:
24:Please incorporate this context into your writing and follow any specific instructions provided.` : ""}
25:
26:Instructions:
27:1. Write in grade 5-6 level Canadian English
28:2. Create an engaging but SEO-friendly title (60-70 characters)
29:3. Create a detailed outline with 4-6 main sections
30:4. For each section, include:
31:   - A clear H2 heading that's topically relevant
32:   - 2-3 H3 subheadings under each main section
33:   - If any of these affiliate products/resources fit naturally as section topics, use them:
34:     ${Array.isArray(post.affiliateLinks) ? post.affiliateLinks.map(link => `- ${link.name}`).join('\n     ') : ''}
35:
36:Format your response as JSON:
37:{
38:  "title": "Your Blog Post Title",
39:  "outline": [
40:    { 
41:      "heading": "First Main Section",
42:      "subheadings": ["Subheading 1", "Subheading 2"],
43:      "affiliate_connection": "Product name if section should feature it, or null"
44:    }
45:  ]
46:}`;

    const outlineResponse = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4000,
      temperature: 0.7,
      messages: [
        { role: "user", content: outlinePrompt }
      ]
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
        affiliateLinksMarkdown = `\n\n## Top ${validAffiliateLinks.length} ${categoryName} Recommendations\n\n`;
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

${post.description ? `Additional Context from User: ${post.description}
Please incorporate this context into your writing and follow any specific instructions provided.
` : ""}

Write an engaging introduction (150-200 words) for a blog post titled "${outlineResult.title}". 
The introduction should:
- Hook the reader with something interesting
- Include the keywords naturally
- Give an overview of what the article will cover
- End with a transition to the first section: "${outlineResult.outline[0]?.heading || 'First Section'}"

Format your response with proper markdown:
# ${outlineResult.title}

[Your introduction here]`;

    const introResponse = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4000,
      temperature: 0.7,
      messages: [{ role: "user", content: introPrompt }]
    });

    let fullContent = introResponse.content[0].text;

    // Insert affiliate links right after the title
    if (affiliateLinksMarkdown) {
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

    // Track affiliate link usage
    const affiliateLinkUsage = new Map<string, number>();

    for (const section of outlineResult.outline) {
      console.log("Generating content for section:", section.heading);

      let affiliateInstructions = "";
      if (section.affiliate_connection && Array.isArray(post.affiliateLinks)) {
        const affiliateProduct = post.affiliateLinks.find(link => link.name === section.affiliate_connection);
        if (affiliateProduct) {
          affiliateInstructions = `
This section should naturally highlight the benefits of ${affiliateProduct.name}.
- Mention specific features or benefits that make it valuable
- Keep the tone informative and helpful, not sales-focused
- The link is already included at the top of the post`;
        }
      }

      const sectionPrompt = `You are a happy and cheerful woman who lives in Canada and works as an SEO content writer. Write about: ${keywords.join(", ")}.
- Use grade 5-6 level Canadian English. 
- Vary sentence lengths and structure to mimic human writing
- Write in a casual, friendly tone like you're talking to a friend. Use simple words that everyone can understand.
- Only include factual information. Do not make up any details.

${post.description ? `Additional Context from User: ${post.description}
Please incorporate this context into your writing and follow any specific instructions provided.
` : ""}
${affiliateInstructions}

Write a detailed section (200-300 words) for the heading "${section.heading}" that's part of "${outlineResult.title}".
Include rich details, examples, personal anecdotes, and naturally place affiliate links where relevant.

Also create content for these subheadings:
${section.subheadings.map(subheading => `- ## ${subheading}`).join('\n')}

Each subheading section should be 100-150 words and provide specific, useful information related to the subheading topic.

Format your response with proper markdown headings:

## ${section.heading}

[Content for main section]

${section.subheadings.map(subheading => `### ${subheading}\n\n[Content for this subheading]`).join('\n\n')}`;

      const sectionResponse = await client.messages.create({
        model: ANTHROPIC_MODEL,
        max_tokens: 4000,
        temperature: 0.7,
        messages: [{ role: "user", content: sectionPrompt }]
      });

      fullContent += sectionResponse.content[0].text + "\n\n";
    }

    console.log("Step 4: Generating conclusion...");
    const conclusionPrompt = `You are a happy and cheerful woman who lives in Canada and works as an SEO content writer. 
- Use grade 5-6 level Canadian English. 
- Use a casual, friendly tone like you're talking to a friend.
- Only include factual information. Do not make up any details.

${post.description ? `Additional Context from User: ${post.description}
Please incorporate this context into your writing and follow any specific instructions provided.
` : ""}

Write a conclusion (150-200 words) for a blog post titled "${outlineResult.title}" about ${keywords.join(", ")}.
The conclusion should:
- Summarize the key points from the article
- Include a personal reflection or takeaway
- End with a call to action or question for the reader

Use proper markdown:

## Wrapping Up

[Your conclusion here]`;

    const conclusionResponse = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4000,
      temperature: 0.7,
      messages: [{ role: "user", content: conclusionPrompt }]
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

${post.description ? `Additional Context from User: ${post.description}
Please incorporate this context into your writing and follow any specific instructions provided.
` : ""}

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
      model: ANTHROPIC_MODEL,
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

${post.description ? `Additional Context from User: ${post.description}
Please incorporate this context into your writing and follow any specific instructions provided.
` : ""}

Write an engaging introduction (150-200 words) for a blog post titled "${outlineResult.title}". 
The introduction should:
- Hook the reader with something interesting
- Include the keywords naturally
- Give an overview of what the article will cover
- End with a transition to the first section: "${outlineResult.outline[0]?.heading || 'First Section'}"

Format your response with proper markdown:
# ${outlineResult.title}

[Your introduction here]`;

    const introResponse = await client.messages.create({
      model: ANTHROPIC_MODEL,
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

${post.description ? `Additional Context from User: ${post.description}
Please incorporate this context into your writing and follow any specific instructions provided.
` : ""}

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
        model: ANTHROPIC_MODEL,
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

${post.description ? `Additional Context from User: ${post.description}
Please incorporate this context into your writing and follow any specific instructions provided.
` : ""}

Write a conclusion (150-200 words) for a blog post titled "${outlineResult.title}" about ${keywords.join(", ")}.
The conclusion should:
- Summarize the key points from the article
- Include a personal reflection or takeaway
- End with a call to action or question for the reader

Use proper markdown:

## Wrapping Up

[Your conclusion here]`;

    const conclusionResponse = await client.messages.create({
      model: ANTHROPIC_MODEL,
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

    // Log more details about which posts were found
    if (postsToProcess.length > 0) {
      postsToProcess.forEach(post => {
        console.log(`- Post ID ${post.id}: "${post.title || 'Untitled'}" (${post.status}) scheduled for ${new Date(post.scheduledDate).toLocaleString()}`);
      });
    } else {
      // If no posts were found, log a sample of all posts to help diagnose
      console.log("No posts to process. Here are all available posts:");
      posts.slice(0, 5).forEach(post => {
        console.log(`- Post ID ${post.id}: "${post.title || 'Untitled'}" (${post.status}) scheduled for ${post.scheduledDate ? new Date(post.scheduledDate).toLocaleString() : 'not scheduled'}`);
      });
    }

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

        // Update the post with generated content
        const updatedPost = await storage.updateBlogPost(post.id, {
          title: generated.title,
          content: generated.content,
          description: generated.description,
          status: "published", // Mark as published locally
          publishedDate: new Date()
        });

        console.log(`Successfully generated content for post ID ${post.id}`);

        // Now publish to WordPress if credentials are available
        if (process.env.WORDPRESS_API_URL && process.env.WORDPRESS_AUTH_TOKEN && process.env.WORDPRESS_USERNAME) {
          console.log(`Attempting to publish post ID ${post.id} to WordPress...`);

          try {
            // Create Basic Auth token from username and application password
            const authToken = Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_AUTH_TOKEN}`).toString('base64');

            const apiUrl = process.env.WORDPRESS_API_URL;
            const endpoint = apiUrl.endsWith('/wp-json') ? `${apiUrl}/wp/v2/posts` : `${apiUrl}/wp/v2/posts`;

            // Prepare the post data for WordPress
            const postData = {
              title: { raw: updatedPost.title },
              content: { raw: updatedPost.content },
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

            // Update the post with WordPress URL if available
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
          console.log(`⚠️ WordPress credentials not configured. Post ID ${post.id} was generated but not published to WordPress.`);
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