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
  description: text("description"), // This field stores content instructions
  internalLinks: jsonb("internal_links").default([]),
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
    description: z.string().optional(), // Optional content instructions
    wordCount: z.number().optional(),
    headings: z.array(z.string()).optional(),
    wordpressUrl: z.string().url().optional(),
  });

export type InsertBlogPost = z.infer<typeof insertBlogPostSchema>;
export type BlogPost = typeof blogPosts.$inferSelect;

export const csvUploadSchema = z.object({
  Keywords: z.string().min(1, "Please enter at least one keyword"),
  Title: z.string().optional(),
  "Scheduled Date": z.string().min(1, "Scheduled date is required"),
  "Scheduled Time": z.string().optional(),
  "Affiliate Product Names": z.string().optional(),
  "Affiliate Product URLs": z.string().optional(),
  "Content Instructions": z.string().optional(),
  "SEO Title": z.string().optional(),
  "SEO Description": z.string().optional(),
  "Internal Link Title": z.string().optional(),
  "Internal Link URL": z.string().optional(),
  "Internal Link Description": z.string().optional(),
}).refine((data) => {
  // If affiliateName is provided, affiliateUrl must also be provided and vice versa
  const hasAffiliateNames = !!data["Affiliate Product Names"]?.trim();
  const hasAffiliateUrls = !!data["Affiliate Product URLs"]?.trim();

  if (hasAffiliateNames !== hasAffiliateUrls) {
    throw new Error("Both affiliate product names and URLs must be provided together");
  }

  // If both are provided, ensure they have the same number of items
  if (hasAffiliateNames && hasAffiliateUrls) {
    const nameCount = data["Affiliate Product Names"]!.split('|').length;
    const urlCount = data["Affiliate Product URLs"]!.split('|').length;
    if (nameCount !== urlCount) {
      throw new Error("Number of affiliate product names must match number of URLs");
    }
  }

  // Validate date and time format
  if (data["Scheduled Time"]) {
    try {
      const dateTime = new Date(`${data["Scheduled Date"]} ${data["Scheduled Time"]}`);
      if (isNaN(dateTime.getTime())) {
        throw new Error("Invalid date/time format");
      }
    } catch {
      throw new Error("Invalid date/time format. Use YYYY-MM-DD for date and HH:MM for time");
    }
  }

  return true;
});