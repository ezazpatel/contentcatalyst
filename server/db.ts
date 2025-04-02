import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Let Neon handle the WebSocket proxy configuration automatically
// Do not set wsProxy as it should be determined from the connection string
neonConfig.pipelineConnect = "password";
neonConfig.useSecureWebSocket = true;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Create connection pool with appropriate settings
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10, // Increase max connections
  idleTimeoutMillis: 30000, // Timeout idle connections after 30 seconds
  connectionTimeoutMillis: 10000 // Connection timeout after 10 seconds
});

// Add event listeners for debugging connection issues
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export const db = drizzle({ client: pool, schema });

// Retry helper for database operations
export async function withRetry<T>(operation: () => Promise<T>, retries = 3): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    if (retries > 0 && error.code === '57P01') {
      console.log("Retrying database operation due to error 57P01...");
      await new Promise(resolve => setTimeout(resolve, 1000));
      return withRetry(operation, retries - 1);
    }
    console.error("Database operation failed:", error);
    throw error;
  }
}

const getBlogPost = async (id: number): Promise<BlogPost | undefined> => {
    try {
      const [blogPost] = await db.select()
        .from(blogPosts)
        .where(eq(blogPosts.id, id));
      return blogPost;
    } catch (error) {
        console.error("Error fetching blog post:", error);
        throw error;
    }
};