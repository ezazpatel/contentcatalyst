import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertBlogPostSchema } from "@shared/schema";
import { checkScheduledPosts } from "./scheduler";
import { runMigrations } from "./migrations";

function convertMarkdownToHTML(markdown: string): string {
  // First preserve product slideshow blocks
  const blocks: string[] = [];
  markdown = markdown.replace(/<div class="product-slideshow">[\s\S]*?<\/div>/g, (match) => {
    blocks.push(match);
    return `__PRODUCT_SLIDESHOW_${blocks.length - 1}__`;
  });

  // Convert markdown to HTML
  let html = markdown
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^\s*[-+*]\s+(.*)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/^\d+\.\s+(.*)/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ol>$&</ol>')
    .replace(/^(?!<[uo]l|<li|<h[1-6])(.*$)/gm, '<p>$1</p>');

  // Restore product slideshow blocks
  blocks.forEach((block, i) => {
    html = html.replace(`__PRODUCT_SLIDESHOW_${i}__`, block);
  });

  return html;
}

export async function registerRoutes(app: Express) {
  await runMigrations();
  checkScheduledPosts();
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

  app.delete("/api/keywords/:keyword", async (req, res) => {
    try {
      const posts = await storage.getAllBlogPosts();
      const postsWithKeyword = posts.filter(post =>
        post.keywords.includes(req.params.keyword) && post.status !== "published"
      );

      for (const post of postsWithKeyword) {
        await storage.deleteBlogPost(post.id);
      }

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

      const posts = await storage.getAllBlogPosts();
      const unpublishedPosts = posts.filter(post => post.status !== "published");

      if (unpublishedPosts.length === 0) {
        return res.json({ message: "No unpublished posts found" });
      }

      console.log(`Starting to publish ${unpublishedPosts.length} posts...`);
      res.json({
        message: `Started publishing ${unpublishedPosts.length} posts. Check logs for progress.`,
        totalPosts: unpublishedPosts.length
      });

      for (const post of unpublishedPosts) {
        try {
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

          await storage.updateBlogPost(post.id, {
            status: "published",
            wordpressUrl: result.link || `${apiUrl.replace('/wp-json', '')}/?p=${result.id}`
          });

          await new Promise(resolve => setTimeout(resolve, 120000));
        } catch (error) {
          console.error(`Failed to publish post ${post.id}:`, error);
        }
      }

      console.log('Finished publishing all posts');
    } catch (error) {
      console.error('Error in publish-all process:', error);
    }
  });

  app.get("/api/settings", async (_req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to get settings" });
    }
  });

  app.patch("/api/settings", async (req, res) => {
    try {
      const settings = await storage.updateSettings(req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: error instanceof Error ? error.message : "Failed to update settings" });
    }
  });

  app.post("/api/wordpress/publish", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      if (settings.test_mode) {
        return res.status(403).json({
          message: "WordPress publishing is disabled in test mode",
          test_mode: true
        });
      }

      if (!process.env.WORDPRESS_API_URL || !process.env.WORDPRESS_AUTH_TOKEN || !process.env.WORDPRESS_USERNAME) {
        throw new Error('WordPress credentials are not configured');
      }

      const authToken = Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_AUTH_TOKEN}`).toString('base64');
      const apiUrl = process.env.WORDPRESS_API_URL;
      const endpoint = apiUrl.endsWith('/wp-json') ? `${apiUrl}/wp/v2/posts` : `${apiUrl}/wp/v2/posts`;

      const htmlContent = convertMarkdownToHTML(req.body.content);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${authToken}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          title: { raw: req.body.title },
          content: { raw: htmlContent },
          status: 'publish',
          excerpt: { raw: req.body.excerpt || '' },
          meta: {
            _yoast_wpseo_metadesc: req.body.seoDescription || '',
            _yoast_wpseo_title: req.body.seoTitle || '',
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

      res.json({
        ...result,
        postUrl: result.link || `${apiUrl.replace('/wp-json', '')}/?p=${result.id}`,
        message: 'Post published successfully to WordPress'
      });
    } catch (error) {
      console.error('Error publishing to WordPress:', error);
      res.status(500).json({
        message: "Failed to publish to WordPress",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  app.post("/api/wordpress/test", async (_req, res) => {
    try {
      if (!process.env.WORDPRESS_API_URL || !process.env.WORDPRESS_AUTH_TOKEN || !process.env.WORDPRESS_USERNAME) {
        throw new Error('WordPress credentials are not configured');
      }

      const authToken = Buffer.from(`${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_AUTH_TOKEN}`).toString('base64');
      const apiUrl = process.env.WORDPRESS_API_URL;
      const endpoint = apiUrl.endsWith('/wp-json') ? `${apiUrl}/wp/v2/posts` : `${apiUrl}/wp/v2/posts`;

      console.log('Testing WordPress API connection...');
      console.log('Endpoint:', endpoint);
      console.log('Auth Header:', `Basic ${authToken.substring(0, 5)}...`);
      console.log('Using WordPress username:', process.env.WORDPRESS_USERNAME);

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

  app.post("/api/posts/:id/publish", async (req, res) => {
    try {
      const postId = parseInt(req.params.id);
      const post = await storage.getBlogPost(postId);

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      const settings = await storage.getSettings();
      if (settings.test_mode) {
        return res.status(403).json({
          message: "WordPress publishing is disabled in test mode",
          test_mode: true
        });
      }

      if (!process.env.WORDPRESS_API_URL || !process.env.WORDPRESS_AUTH_TOKEN) {
        throw new Error('WordPress credentials are not configured');
      }

      // Get the best image for featured image
      let featuredImageId = null;
      if (post.affiliateImages && post.affiliateImages.length > 0) {
        // Sort images by size (preferring larger images)
        const sortedImages = [...post.affiliateImages].sort((a, b) => {
          const aSize = (a.width || 0) * (a.height || 0);
          const bSize = (b.width || 0) * (b.height || 0);
          return bSize - aSize;
        });

        // Upload the best image as featured image
        const bestImage = sortedImages[0];
        const imageResponse = await fetch(bestImage.url);
        const imageBuffer = await imageResponse.buffer();

        const formData = new FormData();
        formData.append('file', new Blob([imageBuffer]), 'featured-image.jpg');

        const imageUploadResponse = await fetch(`${process.env.WORDPRESS_API_URL}/wp/v2/media`, {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${Buffer.from(`admin:${process.env.WORDPRESS_AUTH_TOKEN}`).toString('base64')}`,
          },
          body: formData
        });

        if (imageUploadResponse.ok) {
          const imageData = await imageUploadResponse.json();
          featuredImageId = imageData.id;
        }
      }

      // Convert content to WonderBlocks format
      let content = post.content;

      // Remove "View all photos" links
      content = content.replace(/\*\[View all photos\]\([^)]+\)\*/g, '');

      // Convert to WonderBlocks format
      content = content.replace(/^## (.*$)/gm, '<!-- wp:heading -->\n<h2>$1</h2>\n<!-- /wp:heading -->');
      content = content.replace(/^# (.*$)/gm, '<!-- wp:heading {"level":1} -->\n<h1>$1</h1>\n<!-- /wp:heading -->');

      // Convert paragraphs
      content = content.replace(/^(?!<!-- wp:)([^<].+)$/gm, '<!-- wp:paragraph -->\n<p>$1</p>\n<!-- /wp:paragraph -->');

      // Convert product slideshows to WonderBlocks gallery
      content = content.replace(/<div class="product-slideshow">([\s\S]*?)<\/div>/g, (match, images) => {
        const imgTags = images.match(/<img[^>]+>/g) || [];
        return `<!-- wp:gallery {"linkTo":"none","className":"product-gallery"} -->
<figure class="wp-block-gallery has-nested-images columns-default is-cropped product-gallery">
${imgTags.map(img => {
  const src = img.match(/src="([^"]+)"/)?.[1] || '';
  const alt = img.match(/alt="([^"]+)"/)?.[1] || '';
  return `<!-- wp:image {"sizeSlug":"large"} -->
<figure class="wp-block-image size-large"><img src="${src}" alt="${alt}"/></figure>
<!-- /wp:image -->`;
}).join('\n')}
</figure>
<!-- /wp:gallery -->`;
      });

      // Make the WordPress API request
      const response = await fetch(`${process.env.WORDPRESS_API_URL}/wp/v2/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`admin:${process.env.WORDPRESS_AUTH_TOKEN}`).toString('base64')}`,
        },
        body: JSON.stringify({
          title: { raw: post.title },
          content: { raw: content },
          status: 'publish',
          featured_media: featuredImageId,
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
      console.log('Successfully published to WordPress:', result);

      // Update the post status in our database
      await storage.updateBlogPost(postId, {
        status: "published",
        wordpressUrl: result.link
      });

      res.json({
        ...result,
        postUrl: result.link,
        message: 'Post published successfully to WordPress'
      });
    } catch (error) {
      console.error('Error publishing to WordPress:', error);
      res.status(500).json({
        message: "Failed to publish to WordPress",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  return httpServer;
}