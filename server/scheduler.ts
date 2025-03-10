import { storage } from './storage';
import { db } from './db';
import { blogPosts } from '@shared/schema';
import { lt, eq } from 'drizzle-orm';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateContent(keywords: string[], wordCount: number = 500): Promise<{
  content: string;
  title: string;
  description: string;
}> {
  // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
  const response = await openai.chat.completions.create({
    model: "o3-mini",
    messages: [
      {
        role: "user",
        content: "You are a professional blog content writer. Generate a blog post based on the provided keywords."
      },
      {
        role: "user",
        content: `Write a blog post about ${keywords.join(", ")} with approximately ${wordCount} words. Include a title, main content (in markdown format), and meta description. Respond in JSON format with 'title', 'content', and 'description' fields.`
      }
    ],
    response_format: { type: "json_object" }
  });

  return JSON.parse(response.choices[0].message.content);
}

export async function checkScheduledPosts() {
  try {
    const now = new Date();
    
    // Find all draft posts that are scheduled for now or earlier
    const scheduledPosts = await db
      .select()
      .from(blogPosts)
      .where(
        lt(blogPosts.scheduledDate, now),
        eq(blogPosts.status, 'draft')
      );

    for (const post of scheduledPosts) {
      try {
        // Generate content using OpenAI
        const generated = await generateContent(post.keywords, post.wordCount || 500);

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
  } catch (error) {
    console.error('Error checking scheduled posts:', error);
  }
}

// Run the scheduler every minute
setInterval(checkScheduledPosts, 60000);
