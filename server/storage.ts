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
    console.log('[Storage Debug] Creating blog post with affiliate data:', {
      affiliateLinksCount: post.affiliateLinks?.length || 0,
      affiliateImagesCount: post.affiliateImages?.length || 0,
      affiliateData: {
        links: post.affiliateLinks,
        images: post.affiliateImages?.map(img => ({
          url: img.url,
          affiliateUrl: img.affiliateUrl,
          heading: img.heading
        }))
      }
    });

    const [blogPost] = await db.insert(blogPosts).values(post).returning();
    console.log('[Storage Debug] Created blog post with ID:', blogPost.id, {
      storedAffiliateLinks: blogPost.affiliateLinks,
      storedAffiliateImages: blogPost.affiliateImages
    });
    return blogPost;
  }

  async getBlogPost(id: number): Promise<BlogPost | undefined> {
    const [blogPost] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));

    if (blogPost) {
      console.log('[Storage Debug] Retrieved blog post affiliate data:', {
        postId: id,
        affiliateLinksData: blogPost.affiliateLinks,
        affiliateImagesCount: (blogPost.affiliateImages || []).length,
        affiliateImagesSample: (blogPost.affiliateImages || []).slice(0, 2).map(img => ({
          url: img.url,
          affiliateUrl: img.affiliateUrl,
          heading: img.heading
        }))
      });
    }

    return blogPost;
  }

  async getAllBlogPosts(): Promise<BlogPost[]> {
    return await db.select().from(blogPosts);
  }

  async updateBlogPost(id: number, post: Partial<InsertBlogPost>): Promise<BlogPost> {
    console.log('[Storage Debug] Updating blog post affiliate data:', {
      postId: id,
      updatedAffiliateLinks: post.affiliateLinks,
      updatedAffiliateImages: post.affiliateImages?.map(img => ({
        url: img?.url,
        affiliateUrl: img?.affiliateUrl,
        productCode: img?.productCode
      }))
    });

    const [updated] = await db
      .update(blogPosts)
      .set(post)
      .where(eq(blogPosts.id, id))
      .returning();

    console.log('[Storage Debug] Updated blog post:', {
      postId: updated.id,
      newAffiliateLinksCount: Object.keys(updated.affiliateLinks || {}).length,
      newAffiliateImagesCount: (updated.affiliateImages || []).length
    });

    if (!updated) {
      throw new Error("Post not found");
    }

    return updated;
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