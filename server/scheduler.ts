import { storage } from './storage';
import { BlogPost } from '@shared/schema';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function generateContent(keywords: string[]): Promise<{
  content: string;
  title: string;
  description: string;
}> {
  try {
    // Step 1: Generate title and outline
    const outlineResponse = await openai.chat.completions.create({
      model: "o3-mini",
      messages: [{
        role: "user",
        content: `You are a blog content writer and SEO expert and you are also a travel and experiences enthusiast who loves exploring the different regions of Canada and experiencing new things - both indoor and outdoor. Naturally, you are very knowledgeable about your experiences and love to share them with others.

Use grade 7-8 English. Vary sentence lengths to mimic human writing. Write in a casual, friendly tone like you're talking to a friend. Use simple words that everyone can understand.

For the keyword phrase: ${keywords.join(", ")}

Create a catchy title that naturally includes the keyword phrase and an outline for a comprehensive blog post. The outline should include:
1. Introduction
2. A body that includes a few sections
4. A conclusion section - don't title this section

Respond in JSON format with these fields: 'title' and 'outline' (an array of section objects containing 'heading' and 'subheadings' array).`
      }],
      max_tokens: 1000
    });

    // Parse outline response
    const outlineContent = outlineResponse.choices[0].message.content || '{}';
    let outline;
    let title = '';

    try {
      let parsedOutline;
      try {
        parsedOutline = JSON.parse(outlineContent);
      } catch (jsonError) {
        // If JSON parsing fails, try to extract JSON-like structure from text response
        console.warn('JSON parsing failed, attempting to extract structured data from response');
        const titleMatch = outlineContent.match(/["']title["']\s*:\s*["'](.+?)["']/);
        const outlineMatches = outlineContent.match(/["']outline["']\s*:\s*(\[.+?\])/s);
        
        if (titleMatch && outlineMatches) {
          try {
            parsedOutline = {
              title: titleMatch[1],
              outline: JSON.parse(outlineMatches[1].replace(/[']/g, '"'))
            };
          } catch (e) {
            console.error('Failed to extract structured data:', e);
            throw new Error('Failed to parse AI response');
          }
        } else {
          console.error('Could not extract structured data from response');
          throw new Error('Failed to parse AI response');
        }
      }
      
      title = parsedOutline.title || '';
      outline = parsedOutline.outline || [];
    } catch (error) {
      console.error('Error processing outline response:', error);
      throw new Error('Failed to generate outline');
    }

    // Step 2: Generate introduction
    const introResponse = await openai.chat.completions.create({
      model: "o3-mini",
      messages: [{
        role: "user",
        content: `You are a blog content writer and SEO expert and you are also a travel and experiences enthusiast who loves exploring the different regions of Canada and experiencing new things - both indoor and outdoor. Naturally, you are very knowledgeable about your experiences and love to share them with others.

Use grade 7-8 English. Vary sentence lengths to mimic human writing. Write in a casual, friendly tone like you're talking to a friend. Use simple words that everyone can understand.

Write an engaging introduction for a blog post with the title: "${title}" about the keywords: ${keywords.join(", ")}. 

Respond in JSON format with these fields: 'introduction' and 'description'.`
      }],
      max_tokens: 1000
    });

    // Parse introduction response
    const introContent = introResponse.choices[0].message.content || '{}';
    let introduction = '';
    let description = '';

    try {
      let parsedIntro;
      try {
        parsedIntro = JSON.parse(introContent);
      } catch (jsonError) {
        // If JSON parsing fails, try to extract introduction and description from text response
        console.warn('JSON parsing failed, attempting to extract data from text response');
        const introMatch = introContent.match(/["']introduction["']\s*:\s*["'](.+?)["']/s);
        const descMatch = introContent.match(/["']description["']\s*:\s*["'](.+?)["']/s);
        
        parsedIntro = {
          introduction: introMatch ? introMatch[1] : '',
          description: descMatch ? descMatch[1] : ''
        };
      }
      
      introduction = parsedIntro.introduction || '';
      description = parsedIntro.description || '';
      
      // If we still don't have an introduction, use the entire response as the introduction
      if (!introduction && introContent) {
        introduction = introContent;
        console.log('Using raw response as introduction');
      }
    } catch (error) {
      console.error('Error processing intro response:', error);
      throw new Error('Failed to generate introduction');
    }

    // Step 3: Generate content for each section
    let fullContent = `# ${title}\n\n${introduction}\n\n`;

    // Table of contents
    fullContent += "## Table of Contents\n";
    outline.forEach((section: any) => {
      fullContent += `- [${section.heading}](#${section.heading.toLowerCase().replace(/[^\w]+/g, '-')})\n`;
      if (section.subheadings && section.subheadings.length > 0) {
        section.subheadings.forEach((subheading: string) => {
          fullContent += `  - [${subheading}](#${subheading.toLowerCase().replace(/[^\w]+/g, '-')})\n`;
        });
      }
    });
    fullContent += "\n";

    // Generate content for each section and its subsections
    for (const section of outline) {
      const sectionPrompt = `You are a blog content writer and SEO expert and you are also a travel and experiences enthusiast who loves exploring the different regions of Canada and experiencing new things - both indoor and outdoor. Naturally, you are very knowledgeable about your experiences and love to share them with others.

You have expertise about: ${keywords.join(", ")}.

Use grade 7-8 English. Vary sentence lengths to mimic human writing. Write in a casual, friendly tone like you're talking to a friend. Use simple words that everyone can understand.

Write a section for the heading "${section.heading}" that's part of an article titled "${title}".
Include rich details, examples, personal anecdotes, and naturally place affiliate links where relevant.
Format in markdown and make it engaging and informative.
Include all these subheadings: ${section.subheadings.join(", ")}.

Respond with just the markdown content, no explanations or extra text.`;

      const sectionResponse = await openai.chat.completions.create({
        model: "o3-mini",
        messages: [{ role: "user", content: sectionPrompt }],
        max_tokens: 1500
      });

      const sectionContent = sectionResponse.choices[0].message.content || '';
      fullContent += `${sectionContent}\n\n`;
    }

    // Step 4: Generate conclusion
    const conclusionPrompt = `You are a blog content writer and SEO expert and you are also a travel and experiences enthusiast who loves exploring the different regions of Canada and experiencing new things - both indoor and outdoor. Naturally, you are very knowledgeable about your experiences and love to share them with others.

Use grade 7-8 English. Vary sentence lengths to mimic human writing. Write in a casual, friendly tone like you're talking to a friend. Use simple words that everyone can understand.

Write a compelling conclusion for a blog post with the title: "${title}" about the keywords: ${keywords.join(", ")}.
Format in markdown and end with an encouraging note.

Respond with just the markdown content, no explanations or extra text.`;

    const conclusionResponse = await openai.chat.completions.create({
      model: "o3-mini",
      messages: [{ role: "user", content: conclusionPrompt }],
      max_tokens: 1000
    });

    const conclusionContent = conclusionResponse.choices[0].message.content || '';
    fullContent += `${conclusionContent}`;

    return {
      title,
      content: fullContent,
      description
    };
  } catch (error) {
    console.error('Error generating content:', error);
    throw new Error('Failed to generate content: ' + (error instanceof Error ? error.message : String(error)));
  }
}

// Make this function exportable for manual triggers
export async function checkScheduledPosts() {
  try {
    const now = new Date();

    // Find all draft posts that are scheduled for now or earlier using storage interface
    const scheduledPosts = await storage.getScheduledPosts(now);

    for (const post of scheduledPosts) {
      try {
        console.log(`Processing scheduled post ${post.id}`);

        // Generate content using OpenAI
        const generated = await generateContent(post.keywords);

        // Update the post with generated content
        const updatedPost = await storage.updateBlogPost(post.id, {
          title: generated.title,
          content: generated.content,
          seoDescription: generated.description,
          status: 'published'
        });

        // Publish to WordPress if configured
        if (process.env.WORDPRESS_API_URL && process.env.WORDPRESS_AUTH_TOKEN) {
          const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
          await fetch(`${baseUrl}/api/wordpress/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedPost)
          });
          console.log(`Published post ${post.id} to WordPress successfully`);
        } else {
          console.log(`Post ${post.id} generated and marked as published (WordPress publishing skipped - not configured)`);
        }
      } catch (error) {
        console.error(`Failed to process post ${post.id}:`, error instanceof Error ? error.message : String(error));
        continue; // Continue with next post even if this one failed
      }
    }
  } catch (error) {
    console.error('Error checking scheduled posts:', error instanceof Error ? error.message : String(error));
  }
}

let schedulerInterval: NodeJS.Timeout;

export function startScheduler() {
  // Check immediately on startup
  checkScheduledPosts().catch(console.error);

  // Then schedule future runs
  schedulerInterval = setInterval(() => {
    checkScheduledPosts().catch(console.error);
  }, 60000); // Run every minute

  console.log('Automatic post scheduling is enabled. Posts will be automatically published every minute.');
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    console.log('Automatic post scheduling has been stopped.');
  }
}

// Start the scheduler when this module is imported
startScheduler();