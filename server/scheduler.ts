import { storage } from './storage';
import { db } from './db';
import { blogPosts } from '@shared/schema';
import { lt, eq, and } from 'drizzle-orm';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Helper function to count words in a text
function countWords(text: string): number {
  return text.trim().split(/\s+/).length;
}

// Helper function to validate word count with retries
async function getValidatedResponse(prompt: string, targetWordCount: number, model: string = "o3-mini", maxRetries: number = 3): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    const response = await openai.chat.completions.create({
      model,
      messages: [{
        role: "user",
        content: `${prompt}\n\nIMPORTANT: Your response MUST be EXACTLY ${targetWordCount} words. Not one more, not one less.`
      }],
      top_p: 1
    });

    const content = response.choices[0].message.content || '';
    const wordCount = countWords(content);

    if (wordCount === targetWordCount) {
      return content;
    }

    console.log(`Attempt ${i + 1}: Generated ${wordCount} words, target was ${targetWordCount}. Retrying...`);
  }

  throw new Error(`Failed to generate content with exact word count after ${maxRetries} attempts`);
}

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
5. Where possible, use these affiliate products/services as MAIN SECTION HEADINGS (not subsections): ${affiliateLinks.map(link => link.name).join(", ")}

Create a title and outline for a comprehensive blog post with these specifications:
1. Introduction (exactly ${wordCounts.intro} words)
2. 6-8 main sections, prioritizing affiliate products as section headings where relevant (exactly ${wordCounts.section} words each)
3. 2-3 sub-sections for each main section
4. Conclusion (exactly ${wordCounts.conclusion} words)

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
      content: `Write a factual, well-researched introduction (exactly ${wordCounts.intro} words) for a blog post with the title: "${title}". 

Context: ${context}
Keywords: ${keywords.join(", ")}

Important Instructions:
1. Only include verifiable facts and data
2. No speculative or made-up content
3. Natural tone while maintaining professionalism
4. Include key statistics or data points where relevant
5. The introduction must be EXACTLY ${wordCounts.intro} words - no more, no less.

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
    const introWordCount = countWords(introduction);
    if (introWordCount !== wordCounts.intro) {
      introduction = await getValidatedResponse(
        `Write a factual introduction for "${title}". Context: ${context}`,
        wordCounts.intro
      );
    }
    description = parsedIntro.description || '';
  } catch (error) {
    console.error('Error parsing intro JSON:', error);
  }

  // Step 3: Generate table of contents and full content
  let fullContent = `# ${title}\n\n${introduction}\n\n`;

  // Table of contents
  fullContent += "## Table of Contents\n";
  outline.forEach(section => {
    fullContent += `- [${section.heading}](#${section.heading.toLowerCase().replace(/[^\w]+/g, '-')})\n`;
    if (section.subheadings && section.subheadings.length > 0) {
      section.subheadings.forEach(subheading => {
        fullContent += `  - [${subheading}](#${subheading.toLowerCase().replace(/[^\w]+/g, '-')})\n`;
      });
    }
  });
  fullContent += "\n";

  // Track used affiliate links to prevent duplicates
  const usedAffiliateLinks = new Set();

  // Generate content for each section and its subsections
  for (const section of outline) {
    // Check if this section heading matches an unused affiliate link
    const matchingLink = affiliateLinks.find(link => 
      !usedAffiliateLinks.has(link.name) && 
      section.heading.toLowerCase().includes(link.name.toLowerCase())
    );

    if (matchingLink) {
      usedAffiliateLinks.add(matchingLink.name);
      // Use the affiliate link as a heading with proper markdown link
      fullContent += `## [${matchingLink.name}](${matchingLink.url})\n\n`;
    } else {
      fullContent += `## ${section.heading}\n\n`;
    }

    let sectionContent = await getValidatedResponse(
      `Write a factual, well-researched section for the heading "${section.heading}" that's part of an article titled "${title}".

Context: ${context}
Keywords: ${keywords.join(", ")}

Required subheadings:
${section.subheadings.join("\n")}

Important Instructions:
1. Only include verifiable facts and data
2. No speculative or made-up content
3. Natural tone while maintaining professionalism
4. Include relevant statistics and data points
${!matchingLink && affiliateLinks.length > 0 ? `5. If relevant, naturally incorporate ONE of these unused affiliate links as a subheading:
${affiliateLinks
  .filter(link => !usedAffiliateLinks.has(link.name))
  .map(link => `   - ${link.name}`)
  .join('\n')}` : ''}

Format in markdown and make it informative and engaging.`,
      wordCounts.section
    );

    // If we found any unused affiliate links in the content, mark them as used
    // and convert them to proper markdown links
    affiliateLinks.forEach(link => {
      if (!usedAffiliateLinks.has(link.name) && sectionContent.includes(link.name)) {
        usedAffiliateLinks.add(link.name);
        // Replace the affiliate link name with a markdown link
        const regex = new RegExp(`# ${link.name}|## ${link.name}|### ${link.name}`, 'g');
        sectionContent = sectionContent.replace(regex, `### [${link.name}](${link.url})`);
      }
    });

    fullContent += `${sectionContent}\n\n`;
  }

  // Step 4: Generate conclusion
  const conclusion = await getValidatedResponse(
    `Write a factual, evidence-based conclusion for a blog post with the title: "${title}".

Context: ${context}
Keywords: ${keywords.join(", ")}

Important Instructions:
1. Summarize key points with supporting evidence
2. Include relevant statistics or data points discussed
3. No speculative or made-up content
4. End with actionable insights based on the presented facts

Format in markdown and end with a clear call to action.`,
    wordCounts.conclusion
  );

  fullContent += `## Conclusion\n\n${conclusion}`;

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