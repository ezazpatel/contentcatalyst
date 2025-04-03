import { BlogPost, InsertBlogPost, blogPosts, siteSettings, type SiteSettings } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  getBlogPost(id: number): Promise<BlogPost | undefined>;
  getAllBlogPosts(): Promise<BlogPost[]>;
  updateBlogPost(id: number, post: Partial<InsertBlogPost>): Promise<BlogPost>;
  deleteBlogPost(id: number): Promise<void>;
  // Add settings methods
  getSettings(): Promise<SiteSettings>;
  updateSettings(settings: Partial<SiteSettings>): Promise<SiteSettings>;
}

export class DatabaseStorage implements IStorage {
  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {

    try {
      const [blogPost] = await db.insert(blogPosts).values(post).returning();
      return blogPost;
    } catch (error) {
      console.error('[DB Error] Failed to create blog post:', {
        error: error.message,
        code: error.code,
        detail: error.detail,
        schema: error.schema,
        table: error.table
      });
      throw error;
    }
  }

  async getBlogPost(id: number): Promise<BlogPost | undefined> {
    try {
      const [blogPost] = await db.select()
        .from(blogPosts)
        .where(eq(blogPosts.id, id));
      return blogPost;
    } catch (error) {
      console.error('[DB Error] Failed to fetch blog post:', {
        error: error.message,
        code: error.code,
        detail: error.detail
      });
      throw error;
    }
  }

  async getAllBlogPosts(): Promise<BlogPost[]> {
    return await db.select().from(blogPosts);
  }

  async updateBlogPost(id: number, post: Partial<InsertBlogPost>): Promise<BlogPost> {


    try {

      const [updated] = await db
        .update(blogPosts)
        .set(post)
        .where(eq(blogPosts.id, id))
        .returning();

      if (!updated) {
        console.error('[DB Error] Update failed - post not found:', id);
        throw new Error("Post not found");
      }


      return updated;
    } catch (error) {
      console.error('[DB Error] Failed to update blog post:', {
        error: error.message,
        code: error.code,
        detail: error.detail,
        constraint: error.constraint
      });
      throw error;
    }
  }

  async deleteBlogPost(id: number): Promise<void> {
    // First get the post to check if it exists
    const post = await this.getBlogPost(id);
    if (!post) {
      throw new Error("Post not found");
    }

    // Delete the blog post and all its associated data
    await db.delete(blogPosts)
      .where(eq(blogPosts.id, id))
      .execute();

    console.log(`Successfully deleted blog post ${id} and all associated data`);
  }

  async getSettings(): Promise<SiteSettings> {
    const [settings] = await db.select().from(siteSettings).limit(1);
    if (!settings) {
      // Create default settings if none exist
      const [newSettings] = await db.insert(siteSettings)
        .values({ test_mode: true })
        .returning();
      return newSettings;
    }
    return settings;
  }

  async updateSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
    const current = await this.getSettings();
    const [updated] = await db
      .update(siteSettings)
      .set({ ...settings, last_modified: new Date() })
      .where(eq(siteSettings.id, current.id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();