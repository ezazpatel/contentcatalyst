import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertBlogPostSchema } from "@shared/schema";
import { checkScheduledPosts } from "./scheduler";

// Start the scheduler when the server starts
checkScheduledPosts();

export async function registerRoutes(app: Express) {
  const httpServer = createServer(app);

  app.get("/api/posts", async (_req, res) => {
    const posts = await storage.getAllBlogPosts();
    res.json(posts);
  });

  app.get("/api/posts/:id", async (req, res) => {
    const post = await storage.getBlogPost(Number(req.params.id));
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
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/posts/:id", async (req, res) => {
    try {
      const post = await storage.updateBlogPost(Number(req.params.id), req.body);
      res.json(post);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/posts/:id", async (req, res) => {
    try {
      await storage.deleteBlogPost(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: error.message });
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
          const authToken = Buffer.from(`admin:${process.env.WORDPRESS_AUTH_TOKEN}`).toString('base64');

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

      console.log('Publishing to WordPress endpoint:', endpoint);
      console.log('Publishing content:', {
        title: req.body.title,
        content: req.body.content ? req.body.content.substring(0, 100) + '...' : 'No content',
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
          content: { raw: req.body.content },
          status: 'publish',
          excerpt: { raw: req.body.excerpt || '' },
          meta: {
            _yoast_wpseo_metadesc: req.body.seoDescription || '',
            _yoast_wpseo_title: req.body.seoTitle || '',
            _yoast_wpseo_focuskw: req.body.keywords?.join(', ') || '',
            _yoast_wpseo_linkdex: '50',
            '_yoast_wpseo_meta-robots-noindex': '0',
            '_yoast_wpseo_meta-robots-nofollow': '0',
            '_yoast_wpseo_meta-robots-adv': 'none'
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
        error: error.message,
        details: `Please ensure:
1. You have created an application password in WordPress (Users → Profile → Application Passwords)
2. The WORDPRESS_AUTH_TOKEN contains the application password
3. The WordPress REST API is enabled
4. The user has permissions to create posts`
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
        error: error.message,
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