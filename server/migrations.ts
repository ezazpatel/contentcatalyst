import { db } from './db';
import { blogPosts } from '@shared/schema';
import { neon } from '@neondatabase/serverless';

export async function runMigrations() {
  try {
    console.log('Running migrations...');

    // Check if the blog_posts table exists
    const tableExists = await db.execute(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'blog_posts'
      );
    `);

    // Create the table if it doesn't exist
    if (!tableExists.rows[0].exists) {
      console.log('Creating blog_posts table...');
      await db.execute(`
        CREATE TABLE blog_posts (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          content TEXT DEFAULT '',
          status TEXT NOT NULL DEFAULT 'draft',
          excerpt TEXT,
          seo_title TEXT,
          seo_description TEXT,
          keywords TEXT[] DEFAULT '{}' NOT NULL,
          description TEXT,
          scheduled_date TIMESTAMP,
          published_at TIMESTAMP,
          wordpress_url TEXT,
          affiliate_links JSONB DEFAULT '{}'
        );
      `);
      console.log('Table created successfully');
    } else {

      // Check if wordpress_url column exists, and add it if it doesn't
      const wordpressUrlExists = await db.execute(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'wordpress_url'
        );
      `);

      if (!wordpressUrlExists.rows[0].exists) {
        console.log('Adding wordpress_url column to blog_posts table...');
        await db.execute(`
          ALTER TABLE blog_posts 
          ADD COLUMN wordpress_url TEXT;
        `);
        console.log('Column added successfully');
      } else {
        console.log('Column wordpress_url already exists');
      }

      // Check if affiliate_links column exists, and add it if it doesn't
      const affiliateLinksExists = await db.execute(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'blog_posts' AND column_name = 'affiliate_links'
        );
      `);

      if (!affiliateLinksExists.rows[0].exists) {
        console.log('Adding affiliate_links column to blog_posts table...');
        await db.execute(`
          ALTER TABLE blog_posts 
          ADD COLUMN affiliate_links JSONB DEFAULT '{}';
        `);
        console.log('Column added successfully');
      } else {
      }
    }

    // Add any new migrations below this line

    console.log('All migrations completed');
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  }
}