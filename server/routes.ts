import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { insertBlogPostSchema } from "@shared/schema";
import { checkScheduledPosts } from "./scheduler";
import { runMigrations } from "./migrations";

function convertMarkdownToHTML(markdown: string, affiliateImages?: any[]): string {
  let imageIndex = 0;
  // Convert standard markdown images to WordPress format using affiliate images
  markdown = markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_match, alt) => {
    const image = affiliateImages?.[imageIndex++];
    if (!image) return '';
    
    return `
<!-- wp:image {"sizeSlug":"large"} -->
<figure class="wp-block-image size-large">
  <img src="${image.url}" alt="${image.alt || alt}"/>
  <figcaption class="wp-element-caption">${image.alt || alt}</figcaption>
</figure>
<!-- /wp:image -->`;
  });

  // Convert markdown to HTML
  let html = markdown
    .replace(/^### (.*$)/gm, "<h3>$1</h3>")
    .replace(/^## (.*$)/gm, "<h2>$1</h2>")
    .replace(/^# (.*$)/gm, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^\s*[-+*]\s+(.*)/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>")
    .replace(/^\d+\.\s+(.*)/gm, "<li>$1</li>")
    .replace(/(<li>.*<\/li>\n?)+/g, "<ol>$&</ol>")
    .replace(/^(?!<[uo]l|<li|<h[1-6])(.*$)/gm, "<p>$1</p>");

  // Restore gallery blocks
  html = html.replace(/{{GALLERY_PLACEHOLDER_(\d+)}}/g, (_, index) => galleries[parseInt(index)]);
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
    
    // Log image information
    const imageMatches = post.content.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || [];
    // Extract best quality image URLs from variants before sending
    if (post.affiliateImages) {
      post.affiliateImages = await Promise.all(post.affiliateImages.map(async img => {
        // Find variant with highest resolution
        const bestVariant = img.variants?.reduce((best, current) => {
          const currentRes = (current.width || 0) * (current.height || 0);
          const bestRes = (best?.width || 0) * (best?.height || 0);
          return currentRes > bestRes ? current : best;
        }, null);

        // Get highest quality URL available
        const productDetails = await storage.getViatorProduct(post.id);
        const imageUrl = bestVariant?.url || 
                        img.variants?.[0]?.url || 
                        img.url?.replace('-50x50', '') || 
                        img.url || '';
        
        return {
          url: imageUrl,
          alt: img.caption || '',
          productCode: productDetails?.productCode || '',
          heading: img.heading || '',
        };
      }));
    }

    console.log('[Image Debug]', {
      postId: post.id,
      title: post.title,
      totalImages: imageMatches.length,
      images: imageMatches.map(img => {
        const match = img.match(/!\[([^\]]*)\]\(([^)]*)\)/);
        if (!match) return null;
        return {
          alt: match[1],
          url: match[2],
          raw: img
        };
      }).filter(Boolean),
      affiliateImages: post.affiliateImages?.length || 0,
      affiliateImagesData: post.affiliateImages
    });

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
      const post = await storage.updateBlogPost(
        Number(req.params.id),
        req.body,
      );
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
      const postsWithKeyword = posts.filter(
        (post) =>
          post.keywords.includes(req.params.keyword) &&
          post.status !== "published",
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
        throw new Error("WordPress credentials are not configured");
      }

      const posts = await storage.getAllBlogPosts();
      const unpublishedPosts = posts.filter(
        (post) => post.status !== "published",
      );

      if (unpublishedPosts.length === 0) {
        return res.json({ message: "No unpublished posts found" });
      }

      console.log(`Starting to publish ${unpublishedPosts.length} posts...`);
      res.json({
        message: `Started publishing ${unpublishedPosts.length} posts. Check logs for progress.`,
        totalPosts: unpublishedPosts.length,
      });

      for (const post of unpublishedPosts) {
        try {
          const authToken = Buffer.from(
            `admin:${process.env.WORDPRESS_AUTH_TOKEN}`,
          ).toString("base64");
          const apiUrl = process.env.WORDPRESS_API_URL;
          const endpoint = apiUrl.endsWith("/wp-json")
            ? `${apiUrl}/wp/v2/posts`
            : `${apiUrl}/wp/v2/posts`;

          console.log(`Publishing post ${post.id}: ${post.title}`);

          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Basic ${authToken}`,
            },
            body: JSON.stringify({
              title: { raw: post.title },
              content: { raw: post.content },
              status: "publish",
              excerpt: { raw: post.excerpt || "" },
              meta: {
                _yoast_wpseo_metadesc: post.seoDescription || "",
                _yoast_wpseo_title: post.seoTitle || "",
              },
            }),
            timeout: 120000, // Added timeout
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
              `WordPress API error: ${response.statusText} - ${errorText}`,
            );
          }

          const result = await response.json();
          console.log(
            `Successfully published post ${post.id} to WordPress: ${result.link}`,
          );

          await storage.updateBlogPost(post.id, {
            status: "published",
            wordpressUrl:
              result.link ||
              `${apiUrl.replace("/wp-json", "")}/?p=${result.id}`,
          });

          await new Promise((resolve) => setTimeout(resolve, 120000));
        } catch (error) {
          console.error(`Failed to publish post ${post.id}:`, error);
        }
      }

      console.log("Finished publishing all posts");
    } catch (error) {
      console.error("Error in publish-all process:", error);
    }
  });

  app.get("/api/settings", async (_req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({
        message:
          error instanceof Error ? error.message : "Failed to get settings",
      });
    }
  });

  app.patch("/api/settings", async (req, res) => {
    try {
      const settings = await storage.updateSettings(req.body);
      res.json(settings);
    } catch (error) {
      res.status(500).json({
        message:
          error instanceof Error ? error.message : "Failed to update settings",
      });
    }
  });

  app.post("/api/wordpress/publish", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      if (settings.test_mode) {
        return res.status(403).json({
          message: "WordPress publishing is disabled in test mode",
          test_mode: true,
        });
      }

      if (
        !process.env.WORDPRESS_API_URL ||
        !process.env.WORDPRESS_AUTH_TOKEN ||
        !process.env.WORDPRESS_USERNAME
      ) {
        throw new Error("WordPress credentials are not configured");
      }

      const authToken = Buffer.from(
        `${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_AUTH_TOKEN}`,
      ).toString("base64");
      const apiUrl = process.env.WORDPRESS_API_URL;
      const endpoint = apiUrl.endsWith("/wp-json")
        ? `${apiUrl}/wp/v2/posts`
        : `${apiUrl}/wp/v2/posts`;

      const htmlContent = convertMarkdownToHTML(req.body.content, req.body.affiliateImages);

      // Find highest resolution image overall for featured image
      const allImages = req.body.affiliateImages || [];
      let featuredImage = null;
      let maxResolution = 0;

      allImages.forEach(img => {
        if (img.width && img.height) {
          const resolution = img.width * img.height;
          if (resolution > maxResolution) {
            maxResolution = resolution;
            featuredImage = img.url;
          }
        }
      });

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${authToken}`,
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Accept-Language": "en-US,en;q=0.9",
          Origin: process.env.WORDPRESS_API_URL,
          Referer: process.env.WORDPRESS_API_URL,
        },
        redirect: "follow",
        body: JSON.stringify({
          title: { raw: req.body.title },
          content: {
            raw: htmlContent,
            protected: false,
            rendered: false,
          },
          status: "publish",
          excerpt: { raw: req.body.excerpt || "" },
          meta: {
            _yoast_wpseo_metadesc: req.body.seoDescription || "",
            _yoast_wpseo_title: req.body.seoTitle || "",
          },
          featured_media_url: featuredImage,
        }),
        timeout: 120000, // Added timeout
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("WordPress API response:", errorText);
        throw new Error(
          `WordPress API error: ${response.statusText} - ${errorText}`,
        );
      }

      const result = await response.json();
      console.log("Successfully published to WordPress:", result);

      res.json({
        ...result,
        postUrl:
          result.link || `${apiUrl.replace("/wp-json", "")}/?p=${result.id}`,
        message: "Post published successfully to WordPress",
      });
    } catch (error) {
      console.error("Error publishing to WordPress:", error);
      res.status(500).json({
        message: "Failed to publish to WordPress",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  app.post("/api/wordpress/test", async (_req, res) => {
    try {
      if (
        !process.env.WORDPRESS_API_URL ||
        !process.env.WORDPRESS_AUTH_TOKEN ||
        !process.env.WORDPRESS_USERNAME
      ) {
        throw new Error("WordPress credentials are not configured");
      }

      const authToken = Buffer.from(
        `${process.env.WORDPRESS_USERNAME}:${process.env.WORDPRESS_AUTH_TOKEN}`,
      ).toString("base64");
      const apiUrl = process.env.WORDPRESS_API_URL;
      const endpoint = apiUrl.endsWith("/wp-json")
        ? `${apiUrl}/wp/v2/posts`
        : `${apiUrl}/wp/v2/posts`;

      console.log("Testing WordPress API connection...");
      console.log("Endpoint:", endpoint);
      console.log("Auth Header:", `Basic ${authToken.substring(0, 5)}...`);
      console.log("Using WordPress username:", process.env.WORDPRESS_USERNAME);

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${authToken}`,
          Accept: "application/json",
        },
        timeout: 120000, // Added timeout
      });

      const responseData = await response.text();
      console.log("Response status:", response.status);
      console.log(
        "Response headers:",
        Object.fromEntries(response.headers.entries()),
      );
      console.log("Response body:", responseData);

      if (!response.ok) {
        throw new Error(
          `WordPress API error: ${response.statusText} - ${responseData}`,
        );
      }

      res.json({
        status: "success",
        message: "WordPress API connection successful",
        data: JSON.parse(responseData),
      });
    } catch (error) {
      console.error("Error testing WordPress connection:", error);
      res.status(500).json({
        message: "Failed to connect to WordPress",
        error: error.message,
        details: `Please verify:
1. WORDPRESS_API_URL is correct and ends with /wp-json
2. Application password is correctly formatted
3. WordPress user has administrator privileges
4. REST API is enabled in WordPress`,
      });
    }
  });

  return httpServer;
}