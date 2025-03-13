import { storage } from './storage';
import { db } from './db';
import { blogPosts } from '@shared/schema';
import { lt, eq, and } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY // Make sure to add this to your environment variables
});

async function generateContent(keywords: string[], description: string = "", post: any = {}): Promise<{
  content: string;
  title: string;
  description: string;
}> {
  console.log("Generating content with multi-prompt approach for keywords:", keywords.join(", "));
  
  // Step 1: Generate outline
  console.log("Step 1: Generating outline...");
  const outlinePrompt = `Your task is to generate a detailed blog post based on provided keywords. The blog post should be written from the perspective of a cheerful white woman living in Canada who is a content creator. Use a casual, friendly tone as if talking to a friend, and aim for a grade 5-6 Canadian English level. Keep most sentences short and simple, but mix in a few longer sentences to make strong points. Use simple words that everyone can understand.

You are a happy and cheerful woman who lives in Canada and works as an SEO content writer. 
- Use grade 5-6 level Canadian English. 
- Vary sentence lengths and structure to mimic human writing
- Write in a casual, friendly tone like you're talking to a friend. Use simple words that everyone can understand.
- Only include factual information. Do not make up any details.

Create a detailed outline for a blog post about these keywords: ${keywords.join(", ")}.
${description ? `Context about the keywords: ${description}\n` : ''}

- Generate one main title line and 8 sections with a heading for each section.
- Under each section heading, also create 2-3 level-2 subheadings.
- Respond in JSON format with these fields: 'title' and 'outline'.

The 'outline' should be an array of objects, each with 'heading' and 'subheadings' fields. 'subheadings' should be an array of strings.`;

  const outlineResponse = await anthropic.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 2000,
    system: "You are a professional blog content writer who specializes in creating quality blog content.",
    messages: [
      {
        role: "user",
        content: outlinePrompt
      }
    ],
    temperature: 0.7
  });

  const outlineContent = outlineResponse.content[0].text;
  let outlineResult;
  try {
    const cleanedOutline = outlineContent.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
    outlineResult = JSON.parse(cleanedOutline);
    console.log("Outline generated successfully with title:", outlineResult.title);
  } catch (parseError) {
    console.error("JSON parsing error in outline:", parseError);
    throw new Error("Failed to parse outline JSON");
  }

  // Step 2: Generate introduction
  console.log("Step 2: Generating introduction...");
  const introPrompt = `You are a happy and cheerful woman who lives in Canada and works as an SEO content writer. Write about: ${keywords.join(", ")}.
- Use grade 5-6 level Canadian English. 
- Vary sentence lengths and structure to mimic human writing
- Write in a casual, friendly tone like you're talking to a friend. Use simple words that everyone can understand.
- Only include factual information. Do not make up any details.

Write an engaging introduction (200-300 words) for a blog post with the title: "${outlineResult.title}".

The introduction should include:
1. Welcome and overview - be friendly, and set up what the article will cover
2. Why the topic matters - explain the importance and benefits of the subject
3. What readers will learn - set expectations for the value of the content

Format in markdown and include relevant affiliate links naturally where appropriate. Respond in JSON format with these fields: 'introduction' and 'description'.`;

  const introResponse = await anthropic.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 1000,
    system: "You are a professional blog content writer who specializes in creating quality blog content.",
    messages: [
      {
        role: "user",
        content: introPrompt
      }
    ],
    temperature: 0.7
  });

  const introContent = introResponse.content[0].text;
  let introResult;
  try {
    const cleanedIntro = introContent.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
    introResult = JSON.parse(cleanedIntro);
    console.log("Introduction generated successfully");
  } catch (parseError) {
    console.error("JSON parsing error in introduction:", parseError);
    introResult = {
      introduction: "Welcome to our blog post about " + keywords.join(", ") + "!",
      description: "A detailed guide about " + keywords.join(", ")
    };
  }

  // Step 3: Generate content for each section
  console.log("Step 3: Generating section content...");
  let fullContent = introResult.introduction + "\n\n";
  
  // Track the number of times each affiliate link has been used
  const affiliateLinkUsage = {};
  
  for (const section of outlineResult.outline.slice(0, Math.min(outlineResult.outline.length, 8))) {
    console.log("Generating content for section:", section.heading);
    
    // Prepare affiliate links instruction
    let affiliateLinksInstruction = "";
    if (Array.isArray(post.affiliateLinks) && post.affiliateLinks.length > 0) {
      // Filter out empty links
      const validAffiliateLinks = post.affiliateLinks.filter(link => link.name && link.url);
      
      if (validAffiliateLinks.length > 0) {
        affiliateLinksInstruction = `
- Important: Naturally incorporate these affiliate links in your content, preferably under an H2 or H3 heading:
${validAffiliateLinks.map(link => {
  // Initialize usage counter if not exists
  if (!affiliateLinkUsage[link.url]) {
    affiliateLinkUsage[link.url] = 0;
  }
  
  // Only include links that haven't been used twice yet
  if (affiliateLinkUsage[link.url] < 2) {
    affiliateLinkUsage[link.url]++;
    return `  - [${link.name}](${link.url})`;
  }
  return null;
}).filter(Boolean).join('\n')}
- Each affiliate link should be mentioned naturally within the content, using the exact link text and URL provided.
- Do not list them as a separate list, but weave them into the content in a way that feels natural and helpful to the reader.`;
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
- Format in markdown and make it engaging and informative.
- Include all these subheadings: ${section.subheadings.join(", ")}.
- Respond with just the markdown content, no explanations or extra text.`;

    const sectionResponse = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 1500,
      system: "You are a professional blog content writer who specializes in creating quality blog content.",
      messages: [
        {
          role: "user",
          content: sectionPrompt
        }
      ],
      temperature: 0.7
    });

    const sectionContent = sectionResponse.content[0].text;
    fullContent += "\n\n" + sectionContent;
  }

  // Step 4: Generate conclusion
  console.log("Step 4: Generating conclusion...");
  const conclusionPrompt = `You are a happy and cheerful woman who lives in Canada and works as an SEO content writer. Write about: ${keywords.join(", ")}.
- Use grade 5-6 level Canadian English. 
- Vary sentence lengths and structure to mimic human writing
- Write in a casual, friendly tone like you're talking to a friend. Use simple words that everyone can understand.
- Only include factual information. Do not make up any details.

Write a compelling conclusion (300-400 words) for a blog post with the title: "${outlineResult.title}" about the keywords: ${keywords.join(", ")}.
Summarize key points, include a call to action, and remind readers about the value of the topic.
Format in markdown and end with an encouraging note.
Respond with just the markdown content, no explanations or extra text.`;

  const conclusionResponse = await anthropic.messages.create({
    model: "claude-3-5-haiku-20241022",
    max_tokens: 1000,
    system: "You are a professional blog content writer who specializes in creating quality blog content.",
    messages: [
      {
        role: "user",
        content: conclusionPrompt
      }
    ],
    temperature: 0.7
  });

  const conclusionContent = conclusionResponse.content[0].text;
  fullContent += "\n\n" + conclusionContent;

  // Calculate word count
  const wordCount = fullContent.split(/\s+/).length;
  console.log(`Generated content word count: ${wordCount}`);

  return {
    title: outlineResult.title,
    content: fullContent,
    description: introResult.description || `A comprehensive guide about ${keywords.join(", ")}.`
  };
}

export async function checkScheduledPosts() {
  try {
    const now = new Date();

    console.log(`Checking for scheduled posts at ${now.toISOString()}`);

    // Find all draft posts that are scheduled for now or earlier
    try {
      // Only get posts that are:
      // 1. In 'draft' status
      // 2. Have a scheduled date that has passed
      const scheduledPosts = await db
        .select()
        .from(blogPosts)
        .where(
          and(
            lt(blogPosts.scheduledDate, now),
            eq(blogPosts.status, 'draft')
          )
        );

      console.log(`Found ${scheduledPosts.length} draft posts scheduled for processing`);

      // Log details of found posts
      scheduledPosts.forEach(post => {
        console.log(`Post ID ${post.id}: "${post.title}" - Status: ${post.status}, Scheduled for: ${post.scheduledDate}`);
      });

      for (const post of scheduledPosts) {
        try {
          // Verify post is still in draft status
          const currentPost = await storage.getBlogPost(post.id);
          if (!currentPost || currentPost.status !== 'draft') {
            console.log(`Skipping post ${post.id} - no longer in draft status`);
            continue;
          }

          console.log(`Processing draft post ${post.id}: "${post.title}"`);

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
            seoDescription: generated.description,
            status: 'published'
          });

          // Publish to WordPress
          // Use absolute URL to fix URL parsing error
          const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
          await fetch(`${baseUrl}/api/wordpress/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedPost)
          });

          console.log(`Successfully published post ${post.id}`);
        } catch (error) {
          console.error(`Failed to process post ${post.id}:`, error);
        }
      }
    } catch (dbError) {
      console.error('Database query error:', dbError);
      throw dbError;
    }
  } catch (error) {
    console.error('Error checking scheduled posts:', error);
  }
}

// Run the scheduler every 2 minutes to reduce connection attempts
const SCHEDULER_INTERVAL = 120000; // 2 minutes

console.log(`Scheduler set to run every ${SCHEDULER_INTERVAL/1000} seconds`);
setInterval(checkScheduledPosts, SCHEDULER_INTERVAL);

// Execute once at startup to verify configuration
setTimeout(() => {
  console.log('Running initial scheduled posts check');
  checkScheduledPosts().catch(err => {
    console.error('Initial scheduler check failed:', err);
  });
}, 5000); // Wait 5 seconds after startup