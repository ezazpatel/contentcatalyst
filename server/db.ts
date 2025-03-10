import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Create a mock DB if no real database is available
let pool;
let db;

try {
  if (!process.env.DATABASE_URL) {
    console.warn(
      "DATABASE_URL not set. App will run with limited functionality.\n" +
      "To fix this, create a PostgreSQL database in Replit: Open the Database tab and click 'Create a database'."
    );
    // Creating a mock db object that won't throw errors when methods are called
    db = createMockDb();
  } else {
    // Modify the connection URL to use Neon's connection pooler
    let connectionUrl = process.env.DATABASE_URL;
    if (!connectionUrl.includes('-pooler.')) {
      connectionUrl = connectionUrl.replace('.us-east-', '-pooler.us-east-');
    }

    pool = new Pool({ 
      connectionString: connectionUrl,
      max: 10, // Set max pool size
      idleTimeoutMillis: 30000 // Keep connections alive longer
    });
    db = drizzle({ client: pool, schema });
  }
} catch (error) {
  console.warn("Failed to initialize database:", error.message);
  console.warn("App will run with limited functionality.");
  db = createMockDb();
}

// Create a mock db implementation that won't throw errors
function createMockDb() {
  return {
    select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) }),
    insert: () => ({ values: () => ({ returning: () => Promise.resolve([]) }) }),
    update: () => ({ set: () => ({ where: () => Promise.resolve([]) }) }),
    delete: () => ({ where: () => Promise.resolve([]) }),
    query: {
      select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) })
    }
  };
}

export { pool, db };
