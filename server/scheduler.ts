import { storage } from './storage';
import { db } from './db';
import { blogPosts } from '@shared/schema';
import { lt, eq, and } from 'drizzle-orm';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateContent(keywords: string[], wordCount: number, description: string = ""): Promise<{
  content: string;
  title: string;
  description: string;
}> {
  // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are a professional blog content writer. Generate a blog post that is approximately ${wordCount} words in length, aiming to be within 10% of the target length.`
      },
      {
        role: "user",
        content: `Write a detailed blog post about ${keywords.join(", ")} with approximately ${wordCount} words.
${description ? `Context about the keywords: ${description}\n` : ''}
Include a title, main content (in markdown format), and meta description.
Focus on writing concise, meaningful content that fits within the ${wordCount} word target (±20%).
Respond in JSON format with 'title', 'content', and 'description' fields.`
      }
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: Math.min(6000, wordCount * 4), // Limit tokens based on target word count
  });

  const result = JSON.parse(response.choices[0].message.content);

  // Log word count for monitoring purposes
  const wordCountCheck = result.content.split(/\s+/).length;
  console.log(`Generated content word count: ${wordCountCheck} (target: ${wordCount})`);
  console.log(`Word count difference: ${Math.abs(wordCountCheck - wordCount)} words (${Math.abs(wordCountCheck - wordCount) / wordCount * 100}% variance)`);

  // If the word count is too far off, try regenerating once
  if (Math.abs(wordCountCheck - wordCount) / wordCount > 0.3) { // If more than 30% off
    console.log(`Word count ${wordCountCheck} too far from target ${wordCount}, regenerating...`);
    return generateContent(keywords, wordCount, description);
  }

  return result;
}

export async function checkScheduledPosts() {
  try {
    const now = new Date();

    console.log(`Checking for scheduled posts at ${now.toISOString()}`);

    // Find all draft posts that are scheduled for now or earlier
    try {
      const scheduledPosts = await db
        .select()
        .from(blogPosts)
        .where(
          and(
            lt(blogPosts.scheduledDate, now),
            eq(blogPosts.status, 'draft') // Only select posts in draft status
          )
        );

      console.log(`Found ${scheduledPosts.length} draft posts ready for processing`);

      for (const post of scheduledPosts) {
        try {
          console.log(`Processing post ${post.id}: "${post.title}" (Status: ${post.status})`);

          // Double check status before processing
          if (post.status !== 'draft') {
            console.log(`Skipping post ${post.id} as it's no longer in draft status`);
            continue;
          }

          // Generate content using OpenAI with the post's specified word count
          const generated = await generateContent(
            post.keywords, 
            post.wordCount, 
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

          console.log(`Published post ${post.id} successfully`);
        } catch (error) {
          console.error(`Failed to process post ${post.id}:`, error);
        }
      }
    } catch (dbError) {
      console.error('Database query error:', dbError);
      // Re-throw to be caught by the outer try/catch
      throw dbError;
    }
  } catch (error) {
    console.error('Error checking scheduled posts:', error);

    // Don't crash the application, we'll try again on the next interval
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