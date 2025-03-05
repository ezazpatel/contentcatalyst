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
        content: "You are a professional Canadian travel and lifestyle blogger focused on providing accurate, factual information about Canadian destinations and experiences. Your content must be based on real, verifiable information only. Never invent or embellish details. If you're unsure about specific details, focus on general, well-known facts about the location or topic. Always maintain a friendly, professional tone while ensuring accuracy."
      },
      {
        role: "user",
        content: `Generate a comprehensive, factual blog post focused entirely around the provided keyword phrase. The content must be accurate and verifiable.

Keyword Phrase: ${keywords.join(", ")}

Requirements:
- Title: Create a clear, factual title that accurately represents the content.
- Content:
  - Length: Between 2000-3000 words
  - Focus on verified facts and real information only
  - Include specific, accurate details about locations, activities, and experiences
  - Structure with clear headings and subheadings
  - Use bullet points and lists for key information
  - Only include affiliate links for real, relevant products
  - Conclude with factual summary points
- SEO Meta Description: Create a concise, factual description (max 155 characters)

IMPORTANT: Do not invent experiences, embellish details, or include unverified information. Stick to well-documented facts and general knowledge about the topic.

Respond strictly in JSON format with exactly these fields: 'title', 'content', 'description'. Do not include any extra text outside of this JSON.`
      }
    ],
    response_format: { type: "text" },
    temperature: 0.3, // Lowered temperature for more factual output
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