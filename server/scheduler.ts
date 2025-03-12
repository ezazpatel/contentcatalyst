import { storage } from './storage';
import { db } from './db';
import { blogPosts } from '@shared/schema';
import { lt, eq, and } from 'drizzle-orm';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY // Make sure to add this to your environment variables
});

async function generateContent(keywords: string[], description: string = ""): Promise<{
  content: string;
  title: string;
  description: string;
}> {
  const prompt = `<thinking>
You are a professional blog content writer. Generate a comprehensive blog post.

Write a detailed blog post about ${keywords.join(", ")}.
${description ? `Context about the keywords: ${description}\n` : ''}
Include a title, main content (in markdown format), and meta description.
Focus on writing concise, meaningful content.

You MUST respond in JSON format with 'title', 'content', and 'description' fields.
</thinking>

Write a detailed blog post about ${keywords.join(", ")}.
${description ? `Context about the keywords: ${description}\n` : ''}
Include a title, main content (in markdown format), and meta description.
Respond in JSON format with 'title', 'content', and 'description' fields.`;

  const response = await anthropic.messages.create({
    model: "claude-3-5-haiku-20241022", 
    max_tokens: 4000, // Setting to 4000 tokens to stay within model limits
    system: "You are a professional blog content writer who specializes in creating quality blog content.",
    messages: [
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.7
  });

  const content = response.content[0].text;

  // Improved JSON parsing with error handling
  let result;
  try {
    // Clean up potential control characters before parsing
    const cleanedContent = content.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
    result = JSON.parse(cleanedContent);
  } catch (parseError) {
    console.error("JSON parsing error:", parseError);
    console.log("Raw content causing parsing issues:", content);

    // Attempt to extract JSON using regex as fallback
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const cleanedJson = jsonMatch[0].replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
        result = JSON.parse(cleanedJson);
      } else {
        throw new Error("Could not extract valid JSON");
      }
    } catch (fallbackError) {
      // Create a basic fallback response
      console.error("Fallback parsing failed, using default structure:", fallbackError);
      result = {
        title: "Generated Content (JSON Parsing Error)",
        content: "The AI generated content that could not be properly parsed. Please check the logs and try again.",
        description: "AI-generated content with parsing error."
      };
    }
  }

  // Log word count for monitoring purposes
  const wordCountCheck = result.content.split(/\s+/).length;
  console.log(`Generated content word count: ${wordCountCheck}`);

  return result;
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
            post.description || ""
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