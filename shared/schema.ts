import { pgTable, text, serial, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const blogPosts = pgTable("blog_posts", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").default(""),
  status: text("status").default("draft").notNull(),
  excerpt: text("excerpt"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  keywords: text("keywords").array().default([]).notNull(),
  description: text("description"), // This field stores the keyword context
  internalLinks: jsonb("internal_links").default([]), // New field for internal links
  scheduledDate: timestamp("scheduled_date"),
  publishedDate: timestamp("published_at"),
  wordpressUrl: text("wordpress_url"),
  affiliateLinks: jsonb("affiliate_links").default({})
});

export const insertBlogPostSchema = createInsertSchema(blogPosts)
  .omit({ id: true })
  .extend({
    keywords: z.array(z.string().min(1, "Keyword cannot be empty")),
    affiliateLinks: z.array(z.object({
      name: z.string(),
      url: z.string().url("Invalid URL").or(z.string().length(0))
    })).default([]),
    internalLinks: z.array(z.object({
      title: z.string(),
      url: z.string().url("Invalid URL"),
      description: z.string().optional()
    })).default([]),
    scheduledDate: z.coerce.date(),
    metaTags: z.array(z.string()).optional(),
    excerpt: z.string().optional(),
    slug: z.string().optional(),
    description: z.string().optional(), // Make description optional but ensure it's validated
    wordCount: z.number().optional(),
    headings: z.array(z.string()).optional(),
    wordpressUrl: z.string().url().optional(),
  });

export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

export const csvUploadSchema = z.object({
  keywords: z.string().min(1, "Keywords cannot be empty"),
  affiliateName: z.string().optional(),
  affiliateUrl: z.string().optional(), // Allow multiple URLs separated by commas
  scheduledDate: z.string(),
  description: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  internalLinkTitle: z.string().optional(),
  internalLinkUrl: z.string().url().optional(),
  internalLinkDesc: z.string().optional(),
}).refine((data) => {
  // If affiliateName is provided, affiliateUrl must also be provided and vice versa
  const hasAffiliateNames = !!data.affiliateName?.trim();
  const hasAffiliateUrls = !!data.affiliateUrl?.trim();

  if (hasAffiliateNames !== hasAffiliateUrls) {
    throw new Error("Both affiliate product names and URLs must be provided together");
  }

  // If both are provided, ensure they have the same number of items
  if (hasAffiliateNames && hasAffiliateUrls) {
    const nameCount = data.affiliateName!.split(',').length;
    const urlCount = data.affiliateUrl!.split(',').length;
    if (nameCount !== urlCount) {
      throw new Error("Number of affiliate product names must match number of URLs");
    }
  }

  return true;
});