import { storage } from './storage';
import { BlogPost } from '@shared/schema';
import { generateBlogContent } from './openai-config';

export async function checkScheduledPosts() {
  const now = new Date();

  try {
    // Get all draft posts scheduled for now or earlier using storage interface
    const scheduledPosts = await storage.getScheduledPosts(now);

    for (const post of scheduledPosts) {
      try {
        if (!post.id || !Array.isArray(post.keywords)) {
          console.error(`Invalid post data, skipping post ${post.id}`, post);
          continue;
        }

        console.log(`Processing scheduled post ${post.id}`);

        // Generate content using OpenAI
        const generated = await generateBlogContent(post.keywords);

        // Update the post with generated content
        const updatedPost = await storage.updateBlogPost(post.id, {
          title: generated.title,
          content: generated.content,
          seoDescription: generated.seoMetaDescription,
          status: 'published'
        });

        // Publish to WordPress if configured
        if (process.env.WORDPRESS_API_URL) {
          const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
          try {
            const response = await fetch(`${baseUrl}/api/wordpress/publish`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(updatedPost),
            });

            if (!response.ok) {
              throw new Error(`WordPress API responded with status ${response.status}`);
            }
          } catch (error) {
            console.error(`WordPress publishing failed for post ${post.id}:`, 
              error instanceof Error ? error.message : String(error));
          }
        }

        console.log(`Successfully processed post ${post.id}`);
      } catch (error) {
        console.error(`Failed to process post ${post.id}:`, 
          error instanceof Error ? error.message : String(error));
        continue; // Continue processing other posts
      }
    }
  } catch (error) {
    console.error('Error checking scheduled posts:', 
      error instanceof Error ? error.message : String(error));
  }
}

// Use a more robust scheduling mechanism
let schedulerInterval: NodeJS.Timeout;

export function startScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }

  // Run immediately on start
  checkScheduledPosts().catch(console.error);

  // Then schedule future runs
  schedulerInterval = setInterval(() => {
    checkScheduledPosts().catch(console.error);
  }, 60 * 1000); // Run every minute
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
  }
}

// Start the scheduler
startScheduler();