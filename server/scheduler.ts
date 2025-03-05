import { storage } from './storage';
import { db } from './db';
import { blogPosts } from '@shared/schema';
import { lt, eq, and } from 'drizzle-orm';
import { OpenAI } from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateContent(keywords: string[]): Promise<{
  content: string;
  title: string;
  description: string;
}> {
  const response = await client.chat.completions.create({
    model: "ft:gpt-4o-mini-2024-07-18:personal::B7hWDhzB",
    messages: [
      {
        role: "system",
        content: "You are a happy and cheerful white woman living in Canada who is passionate about travel, adventure, and experiencing both indoor and outdoor activities around the country. You are also a professional blog content creator and SEO specialist who naturally shares expertise and enthusiasm in each blog post."
      },
      {
        role: "user",
        content: `Generate a comprehensive, engaging, and well-organized blog post focused entirely around the provided keyword phrase. This blog post is designed to attract clicks, boost engagement, rank highly in search engines, and provide value to readers.

Keyword Phrase: ${keywords.join(", ")}

Requirements:
- Title: Craft a catchy, engaging, curiosity-driven title using the provided keyword phrase naturally. The title must encourage readers to click.
- Content:
  - Length: Between 2000-3000 words
  - Open with an engaging introductory paragraph (1-2 paragraphs) that naturally includes the keyword phrase and hooks the reader's interest
  - Structure the blog post with clearly formatted markdown headings and subheadings consistently throughout to enhance readability and organization
  - Break up large blocks of text clearly into paragraphs and use bullet points, numbered lists, and bold emphasis to highlight key takeaways, tips, or notable insights
  - Include at least 3-5 subheadings to organize content into distinct sections clearly related to your keyword
  - Naturally incorporate affiliate links within relevant sections of content (use [Affiliate Link] placeholder)
  - End with a short engaging summary or motivational call-to-action
- SEO Meta Description: Create one concise, compelling meta description that naturally includes the keyword phrase (max 155 characters)

Respond strictly in JSON format with exactly these fields: 'title', 'content', 'description'. Do not include any extra text outside of this JSON.`
      }
    ],
    response_format: { type: "text" },
    temperature: 1,
    max_tokens: 2048,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0
  });

  return response.choices[0].message.content ? JSON.parse(response.choices[0].message.content) : {
    title: "",
    content: "",
    description: ""
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
          seoDescription: generated.description,
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