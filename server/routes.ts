import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertBlogPostSchema } from "@shared/schema";
import { ZodError } from "zod";
import { marked } from 'marked';

// Scheduler is already started when the scheduler.ts module is imported

export async function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  app.get("/api/posts", async (_req, res) => {
    const posts = await storage.getAllBlogPosts();
    res.json(posts);
  });

  app.get("/api/posts/:id", async (req, res) => {
    const id = Number(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid post ID" });
    }
    
    const post = await storage.getBlogPost(id);
    if (!post) {
      res.status(404).json({ message: "Post not found" });
      return;
    }
    res.json(post);
  });

  app.post("/api/posts", async (req, res) => {
    try {
      const data = insertBlogPostSchema.parse(req.body);
      const post = await storage.createBlogPost(data);
      res.json(post);
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({ message: "Validation error", errors: error.errors });
      } else {
        res.status(400).json({ message: error instanceof Error ? error.message : "Unknown error occurred" });
      }
    }
  });

  app.patch("/api/posts/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid post ID" });
      }
      
      const post = await storage.updateBlogPost(id, req.body);
      res.json(post);
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Unknown error occurred" });
    }
  });

  app.delete("/api/posts/:id", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid post ID" });
      }
      
      await storage.deleteBlogPost(id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: error instanceof Error ? error.message : "Unknown error occurred" });
    }
  });

  app.post("/api/posts/:id/regenerate", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid post ID" });
      }
      
      const post = await storage.getBlogPost(id);
      if (!post) {
        res.status(404).json({ message: "Post not found" });
        return;
      }

      // Import the generateContent function from scheduler
      const { generateContent } = await import("./scheduler");

      // Generate new content using the same keywords
      const generated = await generateContent(post.keywords);

      // Update the post with newly generated content
      const updatedPost = await storage.updateBlogPost(post.id, {
        title: generated.title,
        content: generated.content,
        seoDescription: generated.description,
        status: 'draft' // Reset to draft status
      });

      res.json(updatedPost);
    } catch (error) {
      console.error('Error regenerating post:', error);
      res.status(500).json({ message: error instanceof Error ? error.message : "Unknown error occurred" });
    }
  });

  app.post("/api/wordpress/publish-all", async (_req, res) => {
    try {
      if (!process.env.WORDPRESS_API_URL || !process.env.WORDPRESS_AUTH_TOKEN) {
        throw new Error('WordPress credentials are not configured');
      }

      // Get all unpublished posts
      const posts = await storage.getAllBlogPosts();
      const unpublishedPosts = posts.filter(post => post.status !== "published");

      if (unpublishedPosts.length === 0) {
        return res.json({ message: "No unpublished posts found" });
      }

      // Start the publishing process
      console.log(`Starting to publish ${unpublishedPosts.length} posts...`);

      // We'll return immediately but continue processing
      res.json({ 
        message: `Started publishing ${unpublishedPosts.length} posts. Check logs for progress.`,
        totalPosts: unpublishedPosts.length
      });

      // Process posts with delay
      for (const post of unpublishedPosts) {
        try {
          // Create Basic Auth token from application password
          const authToken = Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_AUTH_TOKEN}`).toString('base64');

          const apiUrl = process.env.WORDPRESS_API_URL;
          const endpoint = apiUrl.endsWith('/wp-json') ? `${apiUrl}/wp/v2/posts` : `${apiUrl}/wp/v2/posts`;

          console.log(`Publishing post ${post.id}: ${post.title}`);

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${authToken}`
            },
            body: JSON.stringify({
              title: { raw: post.title },
              content: { raw: post.content },
              status: 'publish',
              excerpt: { raw: post.excerpt || '' },
              meta: {
                _yoast_wpseo_metadesc: post.seoDescription || '',
                _yoast_wpseo_title: post.seoTitle || '',
              },
            })
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`WordPress API error: ${response.statusText} - ${errorText}`);
          }

          const result = await response.json();
          console.log(`Successfully published post ${post.id} to WordPress: ${result.link}`);

          // Update post status in our database
          await storage.updateBlogPost(post.id, { status: "published" });

          // Wait for 2 minutes before publishing the next post
          await new Promise(resolve => setTimeout(resolve, 120000));
        } catch (error) {
          console.error(`Failed to publish post ${post.id}:`, error);
          // Continue with next post even if this one failed
        }
      }

      console.log('Finished publishing all posts');
    } catch (error) {
      console.error('Error in publish-all process:', error);
      // Note: We don't send this error to the client as we've already sent a response
    }
  });

  app.post("/api/wordpress/publish", async (req, res) => {
    try {
      if (!process.env.WORDPRESS_API_URL || !process.env.WORDPRESS_AUTH_TOKEN || !process.env.WORDPRESS_USERNAME) {
        throw new Error('WordPress credentials are not configured. Please set WORDPRESS_API_URL, WORDPRESS_USERNAME, and WORDPRESS_AUTH_TOKEN environment variables.');
      }

      // Create Basic Auth token from username and application password
      const authToken = Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_AUTH_TOKEN}`).toString('base64');

      const apiUrl = process.env.WORDPRESS_API_URL;
      const endpoint = apiUrl.endsWith('/wp-json') ? `${apiUrl}/wp/v2/posts` : `${apiUrl}/wp/v2/posts`;

      // Convert markdown content to HTML for WordPress
      const htmlContent = marked.parse(req.body.content);

      console.log('Publishing to WordPress endpoint:', endpoint);
      console.log('Publishing content:', {
        title: req.body.title,
        content: htmlContent ? htmlContent.substring(0, 100) + '...' : 'No content',
        excerpt: req.body.excerpt ? req.body.excerpt.substring(0, 100) + '...' : 'No excerpt'
      });

      // Log the authorization header (without the actual token)
      console.log('Using Authorization header:', 'Basic ' + '*'.repeat(20));
      console.log('Using WordPress username:', process.env.WORDPRESS_USERNAME);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authToken}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          title: { raw: req.body.title },
          content: { raw: htmlContent }, // Use the HTML content instead of markdown
          status: 'publish',
          excerpt: { raw: req.body.excerpt || '' },
          meta: {
            _yoast_wpseo_metadesc: req.body.seoDescription || '',
            _yoast_wpseo_title: req.body.seoTitle || '',
            _yoast_wpseo_focuskw: req.body.keywords?.join(', ') || '',
            _yoast_wpseo_linkdex: '50'
          },
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('WordPress API response:', errorText);
        throw new Error(`WordPress API error: ${response.statusText} - ${errorText}`);
      }

      const result = await response.json();
      console.log('Successfully published to WordPress:', result);

      // Return the WordPress post URL along with the result
      res.json({
        ...result,
        postUrl: result.link || `${apiUrl.replace('/wp-json', '')}/?p=${result.id}`,
        message: 'Post published successfully to WordPress'
      });
    } catch (error) {
      console.error('Error publishing to WordPress:', error);
      res.status(500).json({ 
        message: 'Failed to publish to WordPress', 
        error: error instanceof Error ? error.message : String(error),
        details: `Please ensure:
1. You have created an application password in WordPress (Users → Profile → Application Passwords)
2. The WORDPRESS_AUTH_TOKEN contains the application password
3. The WordPress REST API is enabled
4. The user has permissions to create posts`
      });
    }
  });

  app.post("/api/check-scheduled", async (_req, res) => {
    try {
      // Import the checkScheduledPosts function from scheduler
      const { checkScheduledPosts } = await import("./scheduler");
      
      // Run the scheduled post check
      await checkScheduledPosts();
      
      res.json({ 
        success: true, 
        message: "Successfully checked for scheduled posts" 
      });
    } catch (error) {
      console.error('Error checking scheduled posts:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to check scheduled posts', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Endpoint to manually process a specific post
  app.post("/api/posts/:id/process", async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (isNaN(id) || id <= 0) {
        return res.status(400).json({ message: "Invalid post ID" });
      }
      
      // Import the processPost function from scheduler
      const { processPost } = await import("./scheduler");
      
      // Process the post
      const updatedPost = await processPost(id);
      
      res.json({ 
        success: true, 
        message: "Post processed successfully", 
        post: updatedPost 
      });
    } catch (error) {
      console.error('Error processing post:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to process post', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  app.post("/api/wordpress/test", async (_req, res) => {
    try {
      if (!process.env.WORDPRESS_API_URL || !process.env.WORDPRESS_AUTH_TOKEN || !process.env.WORDPRESS_USERNAME) {
        throw new Error('WordPress credentials are not configured');
      }

      // Create Basic Auth token
      const authToken = Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_AUTH_TOKEN}`).toString('base64');

      const apiUrl = process.env.WORDPRESS_API_URL;
      const endpoint = apiUrl.endsWith('/wp-json') ? `${apiUrl}/wp/v2/posts` : `${apiUrl}/wp/v2/posts`;

      console.log('Testing WordPress API connection...');
      console.log('Endpoint:', endpoint);
      console.log('Auth Header:', `Basic ${authToken.substring(0, 5)}...`);
      console.log('Using WordPress username:', process.env.WORDPRESS_USERNAME);

      // First, try to get posts to verify authentication
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authToken}`,
          'Accept': 'application/json'
        }
      });

      const responseData = await response.text();
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      console.log('Response body:', responseData);

      if (!response.ok) {
        throw new Error(`WordPress API error: ${response.statusText} - ${responseData}`);
      }

      res.json({
        status: 'success',
        message: 'WordPress API connection successful',
        data: JSON.parse(responseData)
      });
    } catch (error) {
      console.error('Error testing WordPress connection:', error);
      res.status(500).json({ 
        message: 'Failed to connect to WordPress', 
        error: error instanceof Error ? error.message : String(error),
        details: `Please verify:
1. WORDPRESS_API_URL is correct and ends with /wp-json
2. Application password is correctly formatted
3. WordPress user has administrator privileges
4. REST API is enabled in WordPress`
      });
    }
  });

  return httpServer;
}