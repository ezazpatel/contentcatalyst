import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Modify the connection URL to use Neon's connection pooler
let connectionUrl = process.env.DATABASE_URL;
if (!connectionUrl.includes('-pooler.')) {
  connectionUrl = connectionUrl.replace('.us-east-', '-pooler.us-east-');
}

export const pool = new Pool({ 
  connectionString: connectionUrl,
  max: 10, // Set max pool size
  idleTimeoutMillis: 30000 // Keep connections alive longer
});
export const db = drizzle({ client: pool, schema });
