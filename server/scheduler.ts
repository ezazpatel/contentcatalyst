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
  // Step 1: Generate title and outline
  const outlineResponse = await openai.chat.completions.create({
    model: "o3-mini",
    messages: [{
      role: "user",
      content: `You are a happy and cheerful white woman who lives in Canada. You are a blog content writer and SEO expert and you are also a travel and experiences enthusiast who loves exploring the different regions of Canada and experiencing new things - both indoor and outdoor. Naturally, you are very knowledgeable about your experiences and love to share them with others.

For the keyword phrase: ${keywords.join(", ")}

Create a catchy title that naturally includes the keyword phrase and an outline for a comprehensive blog post between 1500 and 4000 words. The outline should include:
1. Introduction
2. At least 6-8 main sections with descriptive headings
3. Multiple sub-sections (3-4) for each main section
4. A conclusion section

Respond in JSON format with these fields: 'title' and 'outline' (an array of section objects containing 'heading' and 'subheadings' array).`
    }],
    response_format: { type: "json_object" },
    top_p: 1
  });

  // Parse outline response
  const outlineContent = outlineResponse.choices[0].message.content || '{}';
  let outline;
  let title = '';

  try {
    const parsedOutline = JSON.parse(outlineContent);
    title = parsedOutline.title || '';
    outline = parsedOutline.outline || [];
  } catch (error) {
    console.error('Error parsing outline JSON:', error);
    outline = [];
  }

  // Step 2: Generate introduction and meta description
  const introResponse = await openai.chat.completions.create({
    model: "o3-mini",
    messages: [{
      role: "user",
      content: `You are a happy and cheerful white woman who lives in Canada. You are a blog content writer and SEO expert and you are also a travel and experiences enthusiast.

Write an engaging introduction (400-500 words) for a blog post with the title: "${title}" about the keywords: ${keywords.join(", ")}. 
Also provide a compelling meta description under 155 characters.

Respond in JSON format with these fields: 'introduction' and 'description'.`
    }],
    response_format: { type: "json_object" },
    top_p: 1
  });

  // Parse introduction response
  const introContent = introResponse.choices[0].message.content || '{}';
  let introduction = '';
  let description = '';

  try {
    const parsedIntro = JSON.parse(introContent);
    introduction = parsedIntro.introduction || '';
    description = parsedIntro.description || '';
  } catch (error) {
    console.error('Error parsing intro JSON:', error);
  }

  // Step 3: Generate content for each section
  let fullContent = `# ${title}\n\n${introduction}\n\n`;

  // Table of contents
  fullContent += "## Table of Contents\n";
  outline.forEach((section, index) => {
    fullContent += `- [${section.heading}](#${section.heading.toLowerCase().replace(/[^\w]+/g, '-')})\n`;
    if (section.subheadings && section.subheadings.length > 0) {
      section.subheadings.forEach(subheading => {
        fullContent += `  - [${subheading}](#${subheading.toLowerCase().replace(/[^\w]+/g, '-')})\n`;
      });
    }
  });
  fullContent += "\n";

  // Generate content for each section and its subsections
  for (const section of outline) {
    const sectionPrompt = `You are a happy and cheerful white woman who lives in Canada. You are a blog content writer with expertise about: ${keywords.join(", ")}.

Write a detailed section (600-800 words) for the heading "${section.heading}" that's part of an article titled "${title}".
Include rich details, examples, personal anecdotes, and naturally place affiliate links where relevant.
Format in markdown and make it engaging and informative.
Include all these subheadings: ${section.subheadings.join(", ")}.

Respond with just the markdown content, no explanations or extra text.`;

    const sectionResponse = await openai.chat.completions.create({
      model: "o3-mini",
      messages: [{ role: "user", content: sectionPrompt }],
      top_p: 1
    });

    const sectionContent = sectionResponse.choices[0].message.content || '';
    fullContent += `${sectionContent}\n\n`;
  }

  // Step 4: Generate conclusion
  const conclusionPrompt = `You are a happy and cheerful white woman who lives in Canada. You are a blog content writer.

Write a compelling conclusion (300-400 words) for a blog post with the title: "${title}" about the keywords: ${keywords.join(", ")}.
Summarize key points, include a call to action, and remind readers about the value of the topic.
Format in markdown and end with an encouraging note.

Respond with just the markdown content, no explanations or extra text.`;

  const conclusionResponse = await openai.chat.completions.create({
    model: "o3-mini",
    messages: [{ role: "user", content: conclusionPrompt }],
    top_p: 1
  });

  const conclusionContent = conclusionResponse.choices[0].message.content || '';
  fullContent += `${conclusionContent}`;

  return {
    title,
    content: fullContent,
    description
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