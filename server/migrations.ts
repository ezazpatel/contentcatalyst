
import { sql } from "drizzle-orm";
import { db } from "./db";

export async function runMigrations() {
  console.log("Running database migrations...");
  
  try {
    // Check if wordpress_url column exists
    const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='blog_posts' AND column_name='wordpress_url'
    `);
    
    // If wordpress_url column doesn't exist, add it
    if (result.rows.length === 0) {
      console.log("Adding wordpress_url column to blog_posts table...");
      await db.execute(sql`
        ALTER TABLE blog_posts 
        ADD COLUMN wordpress_url TEXT
      `);
      console.log("Migration complete: wordpress_url column added.");
    } else {
      console.log("wordpress_url column already exists.");
    }
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}
