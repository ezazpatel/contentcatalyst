import { storage } from './storage';
import { db } from './db';
import { blogPosts } from '@shared/schema';
import { lt, eq, and } from 'drizzle-orm';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generateContent(keywords: string[]): Promise<{
  content: string;
  title: string;
  description: string;
}> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{
      role: "user",
      content: `You are a happy and cheerful white woman who lives in Canada. You are a blog content writer and SEO expert and you are also a travel and experiences enthusiast who loves exploring the different regions of Canada and experiencing new things - both indoor and outdoor. Naturally, you are very knowledgeable about your experiences and love to share them with others.

Generate a blog post and SEO metadata for the keyword phrase provided. Write in a friendly, conversational tone.

For the keyword phrase: ${keywords.join(", ")}

Requirements:
- A catchy title that naturally includes the keyword. Something the viewer cannot help but click.
- Main content in markdown format (REQUIRED: EXACTLY 2000-3000 words) with multiple clear headings and subheadings. The content must be comprehensive and thorough.
- Include affiliate links naturally within the content where relevant.
- A meta description (max 155 characters) for search results.

Respond strictly in JSON format with exactly these fields: 'title', 'content', 'description' (short). Do not include any extra text outside of this JSON.`
    }],
    response_format: { type: "json_object" },
    temperature: 1,
    top_p: 1,
    frequency_penalty: 0,
    presence_penalty: 0
  });

  try {
    const rawContent = response.choices[0].message.content || '';

    // Remove markdown code blocks if present
    let jsonContent = rawContent;
    if (rawContent.includes('```json')) {
      // Extract content between ```json and ``` marks
      const match = rawContent.match(/```json\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        jsonContent = match[1];
      }
    }

    // Clean any other potential markdown or whitespace issues
    jsonContent = jsonContent.trim();

    return jsonContent ? JSON.parse(jsonContent) : {
      title: "",
      content: "",
      description: ""
    };
  } catch (error) {
    console.error('Error parsing JSON response:', error);
    // If JSON parsing fails, try to extract content in a best-effort way
    const content = response.choices[0].message.content || '';
    return {
      title: content.split('\n')[0] || 'Generated Post',
      content: content,
      description: content.substring(0, 155)
    };
  }
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