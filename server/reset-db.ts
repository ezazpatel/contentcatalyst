
import { db, pool } from "./db";
import * as schema from "@shared/schema";
import { sql } from "drizzle-orm";

async function resetDatabase() {
  console.log("Starting database reset...");
  
  try {
    // Drop all tables
    console.log("Dropping all tables...");
    await db.execute(sql`DROP TABLE IF EXISTS ${schema.blogPosts} CASCADE;`);
    
    // Recreate the tables based on the schema
    console.log("Recreating tables...");
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS ${schema.blogPosts} (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        keywords TEXT[] NOT NULL,
        affiliate_links JSONB DEFAULT '[]'::jsonb NOT NULL,
        headings JSONB DEFAULT '[]'::jsonb NOT NULL,
        seo_title TEXT,
        seo_description TEXT,
        excerpt TEXT,
        slug TEXT,
        meta_tags TEXT[],
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        published_at TIMESTAMP,
        wp_post_id INTEGER,
        status TEXT DEFAULT 'draft',
        scheduled_date TIMESTAMP
      );
    `);
    
    console.log("Database reset completed successfully!");
  } catch (error) {
    console.error("Error resetting database:", error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

// Execute the reset function
resetDatabase();
