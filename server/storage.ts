import { BlogPost, InsertBlogPost, blogPosts as postsTable } from "../shared/schema";
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
    const [blogPost] = await db.insert(postsTable).values(post).returning();
    if (!blogPost) {
      throw new Error("Failed to create blog post");
    }
    return blogPost;
  }

  async getBlogPost(id: number): Promise<BlogPost | undefined> {
    const [blogPost] = await db
      .select()
      .from(postsTable)
      .where(eq(postsTable.id, id));
    return blogPost;
  }

  async getAllBlogPosts(): Promise<BlogPost[]> {
    return await db.select().from(postsTable);
  }

  async updateBlogPost(id: number, post: Partial<InsertBlogPost>): Promise<BlogPost> {
    const [updated] = await db
      .update(postsTable)
      .set(post)
      .where(eq(postsTable.id, id))
      .returning();

    if (!updated) {
      throw new Error("Post not found");
    }

    return updated;
  }

  async deleteBlogPost(id: number): Promise<void> {
    await db.delete(postsTable).where(eq(postsTable.id, id));
  }

  async getScheduledPosts(before: Date): Promise<BlogPost[]> {
    return await db
      .select()
      .from(postsTable)
      .where(
        and(
          lt(postsTable.scheduledDate, before),
          eq(postsTable.status, 'draft')
        )
      );
  }
}

export const storage = new DatabaseStorage();