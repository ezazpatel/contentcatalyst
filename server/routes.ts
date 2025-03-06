import express from "express";
import { createServer } from "http";
import { storage } from "./storage";
import { BlogPostStatus } from "../shared/schema";
import { generateBlogContent } from "./openai-config";

export async function registerRoutes(app: express.Express) {
  const server = createServer(app);

  app.get("/api/posts", async (req, res) => {
    try {
      const blogPosts = await storage.getAllBlogPosts();
      res.json(blogPosts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch blog posts" });
    }
  });

  app.post("/api/posts", async (req, res) => {
    try {
      const blogPost = await storage.createBlogPost(req.body);
      res.status(201).json(blogPost);
    } catch (error) {
      res.status(500).json({ message: "Failed to create blog post" });
    }
  });

  app.get("/api/posts/:id", async (req, res) => {
    try {
      const blogPost = await storage.getBlogPost(Number(req.params.id));
      if (!blogPost) {
        return res.status(404).json({ message: "Blog post not found" });
      }
      res.json(blogPost);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch blog post" });
    }
  });

  app.put("/api/posts/:id", async (req, res) => {
    try {
      const blogPost = await storage.updateBlogPost(
        Number(req.params.id),
        req.body
      );
      res.json(blogPost);
    } catch (error) {
      res.status(500).json({ message: "Failed to update blog post" });
    }
  });

  app.delete("/api/posts/:id", async (req, res) => {
    try {
      await storage.deleteBlogPost(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete blog post" });
    }
  });

  app.post("/api/posts/:id/generate", async (req, res) => {
    try {
      const id = Number(req.params.id);
      const post = await storage.getBlogPost(id);

      if (!post) {
        return res.status(404).json({ message: "Blog post not found" });
      }

      if (!post.keywords || !Array.isArray(post.keywords)) {
        return res.status(400).json({ message: "Post keywords are required for generation" });
      }

      const result = await generateBlogContent(post.keywords);

      if (!result) {
        return res.status(400).json({ message: "Failed to generate blog post" });
      }

      const updatedPost = await storage.updateBlogPost(id, {
        content: result.content,
        title: result.title,
        description: result.description,
        status: BlogPostStatus.PUBLISHED
      });

      res.json(updatedPost);
    } catch (error) {
      console.error("Error generating blog post:", error);
      res.status(500).json({ message: "Failed to generate blog post" });
    }
  });

  return server;
}