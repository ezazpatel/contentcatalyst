import { BlogPost, InsertBlogPost, blogPosts } from "@shared/schema";
import { db } from "./db";
import { eq, lt, and } from "drizzle-orm";

export interface IStorage {
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  getBlogPost(id: number): Promise<BlogPost | undefined>;
  getAllBlogPosts(): Promise<BlogPost[]>;
  updateBlogPost(id: number, post: Partial<InsertBlogPost>): Promise<BlogPost>;
  deleteBlogPost(id: number): Promise<void>;
  getScheduledPosts(before: Date): Promise<BlogPost[]>;
}

export class DatabaseStorage implements IStorage {
  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    const [blogPost] = await db.insert(blogPosts).values(post).returning();
    return blogPost;
  }

  async getBlogPost(id: number): Promise<BlogPost | undefined> {
    const [blogPost] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    return blogPost;
  }

  async getAllBlogPosts(): Promise<BlogPost[]> {
    return await db.select().from(blogPosts);
  }

  async updateBlogPost(id: number, post: Partial<InsertBlogPost>): Promise<BlogPost> {
    const [updated] = await db
      .update(blogPosts)
      .set(post)
      .where(eq(blogPosts.id, id))
      .returning();

    if (!updated) {
      throw new Error("Post not found");
    }

    return updated;
  }

  async deleteBlogPost(id: number): Promise<void> {
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
  }

  async getScheduledPosts(before: Date): Promise<BlogPost[]> {
    return await db
      .select()
      .from(blogPosts)
      .where(
        and(
          lt(blogPosts.scheduledDate, before),
          eq(blogPosts.status, 'draft')
        )
      );
  }
}

export const storage = new DatabaseStorage();