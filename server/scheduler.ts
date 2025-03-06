import { storage } from './storage';
import { db } from './db';
import { blogPosts } from '@shared/schema';
import { lt, eq, and } from 'drizzle-orm';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generateContent(keywords: string[], context: string, wordCounts: {
  intro: number;
  section: number;
  conclusion: number;
}, affiliateLinks: { name: string; url: string; }[]): Promise<{
  content: string;
  title: string;
  description: string;
}> {
  // Step 1: Generate title and outline
  const outlineResponse = await openai.chat.completions.create({
    model: "o3-mini",
    messages: [{
      role: "user",
      content: `You are a professional content writer creating factual, well-researched blog content. Your task is to write about: ${context}

Keywords to focus on: ${keywords.join(", ")}

Important Instructions:
1. Only include factual, verifiable information. No made-up stories or speculative content.
2. Use credible sources and current data where applicable.
3. Natural tone while maintaining professionalism.
4. Include the keyword phrases naturally without forcing them.

Create a title and outline for a comprehensive blog post with these specifications:
1. Introduction (${wordCounts.intro} words)
2. At least 6-8 main sections with descriptive headings (${wordCounts.section} words each)
3. Multiple sub-sections (3-4) for each main section
4. Conclusion (${wordCounts.conclusion} words)

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
      content: `Write a factual, well-researched introduction (${wordCounts.intro} words) for a blog post with the title: "${title}". 

Context: ${context}
Keywords: ${keywords.join(", ")}

Important Instructions:
1. Only include verifiable facts and data
2. No speculative or made-up content
3. Natural tone while maintaining professionalism
4. Include key statistics or data points where relevant

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
    const sectionPrompt = `Write a factual, well-researched section (${wordCounts.section} words) for the heading "${section.heading}" that's part of an article titled "${title}".

Context: ${context}
Keywords: ${keywords.join(", ")}

Required subheadings:
${section.subheadings.join("\n")}

Important Instructions:
1. Only include verifiable facts and data
2. No speculative or made-up content
3. Natural tone while maintaining professionalism
4. Include relevant statistics and data points
${affiliateLinks.length > 0 ? `5. Naturally incorporate these affiliate links where relevant:
${affiliateLinks.map(link => `   - ${link.name}: ${link.url}`).join('\n')}` : ''}

Format in markdown and make it informative and engaging.

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
  const conclusionPrompt = `Write a factual, evidence-based conclusion (${wordCounts.conclusion} words) for a blog post with the title: "${title}".

Context: ${context}
Keywords: ${keywords.join(", ")}

Important Instructions:
1. Summarize key points with supporting evidence
2. Include relevant statistics or data points discussed
3. No speculative or made-up content
4. End with actionable insights based on the presented facts

Format in markdown and end with a clear call to action.

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
        const generated = await generateContent(
          post.keywords,
          post.contextDescription || '',
          {
            intro: post.introLength || 400,
            section: post.sectionLength || 600,
            conclusion: post.conclusionLength || 300
          },
          post.affiliateLinks || []
        );

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

// Automatic scheduler enabled
// To disable, comment out the line below
setInterval(checkScheduledPosts, 60000);
console.log('Automatic post scheduling is enabled. Posts will be automatically published every minute.');