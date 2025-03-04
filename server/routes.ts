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

  app.post("/api/generate", async (req, res) => {
    try {
      const { keywords, type } = req.body;

      // Import OpenAI
      const OpenAI = require('openai');

      // Initialize the OpenAI client
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      let prompt = "";

      // Define prompt based on generation type
      if (type === "content") {
        prompt = `
Write a blog post about "${keywords.join(", ")}".
The content should be formatted in Markdown, with appropriate headings, paragraphs, and emphasis.
The post should be informative, engaging, and around 400-500 words.
Include an introduction, 2-3 main sections, and a conclusion.
`;
      } else if (type === "title") {
        prompt = `
Create an SEO-friendly title for a blog post about "${keywords.join(", ")}".
The title should be catchy, include the main keyword, and be under 60 characters.
`;
      } else if (type === "description") {
        prompt = `
Write a meta description for a blog post about "${keywords.join(", ")}".
The description should be engaging, include the main keyword, and be under 160 characters.
`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that generates blog content."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const content = response.choices[0].message.content || "Sorry, I couldn't generate content.";
      res.json({ content });
    } catch (error) {
      console.error("Error calling OpenAI API:", error);
      res.status(500).json({ message: "Failed to generate content. Please try again." });
    }
  });

  app.post("/api/wordpress/publish", async (req, res) => {
    try {
      const response = await fetch(process.env.WORDPRESS_API_URL + '/wp/v2/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.WORDPRESS_AUTH_TOKEN}`
        },
        body: JSON.stringify({
          title: req.body.title,
          content: req.body.content,
          status: 'publish',
          excerpt: req.body.excerpt || '',
          meta: {
            _yoast_wpseo_metadesc: req.body.seoDescription || '',
            _yoast_wpseo_title: req.body.seoTitle || '',
          },
        })
      });

      if (!response.ok) {
        throw new Error(`WordPress API error: ${response.statusText}`);
      }

      res.json(await response.json());
    } catch (error) {
      console.error('Error publishing to WordPress:', error);
      res.status(500).json({ message: 'Failed to publish to WordPress' });
    }
  });

  return httpServer;
}