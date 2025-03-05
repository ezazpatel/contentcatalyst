import { storage } from './storage';
import { db } from './db';
import { blogPosts } from '@shared/schema';
import { lt, eq, and } from 'drizzle-orm';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateContent(keywords: string[]): Promise<{
  content: string;
  title: string;
  description: string;
  seoMetaDescription: string;
}> {
  // Use o1-mini model for all OpenAI API calls
  const response = await openai.chat.completions.create({
    model: "o1-mini",
    messages: [
      {
        role: "system",
        content: "You are a professional blog content writer and SEO expert. Generate a blog post and SEO metadata based on the provided keywords."
      },
      {
        role: "user",
        content: `Write a blog post about ${keywords.join(", ")}. Include:
1. A catchy title
2. Main content (in markdown format)
3. A meta description for search results (max 155 characters)
4. A longer SEO-optimized description (max 320 characters) for Yoast SEO
Respond in JSON format with 'title', 'content', 'description' (short), and 'seoMetaDescription' (long) fields.`
      }
    ],
    response_format: { type: "json_object" }
  });

  return response.choices[0].message.content ? JSON.parse(response.choices[0].message.content) : {
    title: "",
    content: "",
    description: "",
    seoMetaDescription: ""
  };
}

export async function checkScheduledPosts() {
  try {
    const now = new Date();

    // Find all draft posts that are scheduled for now or earlier
    const scheduledPosts = await db
      .select()
      .from(blogPosts)
      .where(
        and(
          lt(blogPosts.scheduledDate, now),
          eq(blogPosts.status, 'draft')
        )
      );

    for (const post of scheduledPosts) {
      try {
        // Generate content using OpenAI
        const generated = await generateContent(post.keywords);

        // Update the post with generated content
        const updatedPost = await storage.updateBlogPost(post.id, {
          title: generated.title,
          content: generated.content,
          seoDescription: generated.seoMetaDescription,
          status: 'published'
        });

        // Publish to WordPress
        const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
        await fetch(`${baseUrl}/api/wordpress/publish`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedPost)
        });

        console.log(`Published post ${post.id} successfully`);
      } catch (error) {
        console.error(`Failed to process post ${post.id}:`, error instanceof Error ? error.message : String(error));
      }
    }
  } catch (error) {
    console.error('Error checking scheduled posts:', error instanceof Error ? error.message : String(error));
  }
}

// Run the scheduler every minute
setInterval(checkScheduledPosts, 60000);