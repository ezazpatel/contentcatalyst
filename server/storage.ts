import { BlogPost, InsertBlogPost } from "@shared/schema";

export interface IStorage {
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  getBlogPost(id: number): Promise<BlogPost | undefined>;
  getAllBlogPosts(): Promise<BlogPost[]>;
  updateBlogPost(id: number, post: Partial<InsertBlogPost>): Promise<BlogPost>;
  deleteBlogPost(id: number): Promise<void>;
}

export class MemStorage implements IStorage {
  private posts: Map<number, BlogPost>;
  private currentId: number;

  constructor() {
    this.posts = new Map();
    this.currentId = 1;
  }

  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    const id = this.currentId++;
    const blogPost: BlogPost = { id, ...post };
    this.posts.set(id, blogPost);
    return blogPost;
  }

  async getBlogPost(id: number): Promise<BlogPost | undefined> {
    return this.posts.get(id);
  }

  async getAllBlogPosts(): Promise<BlogPost[]> {
    return Array.from(this.posts.values());
  }

  async updateBlogPost(id: number, post: Partial<InsertBlogPost>): Promise<BlogPost> {
    const existing = await this.getBlogPost(id);
    if (!existing) {
      throw new Error("Post not found");
    }
    const updated = { ...existing, ...post };
    this.posts.set(id, updated);
    return updated;
  }

  async deleteBlogPost(id: number): Promise<void> {
    this.posts.delete(id);
  }
}

export const storage = new MemStorage();
