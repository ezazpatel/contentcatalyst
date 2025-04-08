import { pgTable, text, serial, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const siteSettings = pgTable("site_settings", {
  id: serial("id").primaryKey(),
  test_mode: boolean("test_mode").default(true).notNull(),
  last_modified: timestamp("last_modified").defaultNow(),
});

export const settingsSchema = createInsertSchema(siteSettings).omit({ id: true });
export type SiteSettings = typeof siteSettings.$inferSelect;
export type InsertSettings = z.infer<typeof settingsSchema>;

export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").default(""),
  status: text("status").default("draft").notNull(),
  excerpt: text("excerpt"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  keywords: text("keywords").array().default([]).notNull(),
  description: text("description"), // This field stores content instructions
  scheduledDate: timestamp("scheduled_date"),
  publishedDate: timestamp("published_at"),
  wordpressUrl: text("wordpress_url"),
  affiliateLinks: jsonb("affiliate_links").default({}),
  // New fields for storing affiliate product images
  affiliateImages: jsonb("affiliate_images").default([]).notNull(),
});

// Define the structure for affiliate images
const affiliateImageSchema = z.object({
  url: z.string().url("Invalid image URL"),
  alt: z.string(),
  affiliateUrl: z.string().url("Invalid affiliate URL"),
  heading: z.string().optional(), // Made optional as per type definition
  productCode: z.string().optional(), // Made optional as per type definition
});

export const insertBlogPostSchema = createInsertSchema(blogPosts)
  .omit({ id: true })
  .extend({
    keywords: z.array(z.string().min(1, "Keyword cannot be empty")),
    secondaryKeywords: z.array(z.string()).optional().default([]),
    affiliateLinks: z.array(z.object({
      name: z.string(),
      url: z.string().url("Invalid URL").or(z.string().length(0))
    })).default([]),
    scheduledDate: z.coerce.date(),
    metaTags: z.array(z.string()).optional(),
    excerpt: z.string().optional(),
    slug: z.string().optional(),
    description: z.string().optional(), // Optional content instructions
    wordCount: z.number().optional(),
    headings: z.array(z.string()).optional(),
    wordpressUrl: z.string().url().optional(),
    affiliateImages: z.array(affiliateImageSchema).default([]),
  });

export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;
export type AffiliateImage = z.infer<typeof affiliateImageSchema>;

export const csvUploadSchema = z.object({
  "Primary Keyword": z.string().min(1, "Primary keyword is required"),
  "Secondary Keyword": z.string().optional(),
  "Scheduled Date": z.string().min(1, "Scheduled date is required"),
  "Scheduled Time": z.string().min(1, "Scheduled time is required"),
}).refine((data) => {

  // Validate date and time format
  try {
    const dateTime = new Date(`${data["Scheduled Date"]} ${data["Scheduled Time"]}`);
    if (isNaN(dateTime.getTime())) {
      throw new Error("Invalid date/time format");
    }
  } catch {
    throw new Error("Invalid date/time format. Use YYYY-MM-DD for date and HH:MM for time");
  }

  return true;
});