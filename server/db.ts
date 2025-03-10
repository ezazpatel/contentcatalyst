import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;
// Configure connection settings
neonConfig.wsProxy = process.env.NODE_ENV === 'production'; // Only use proxy in production
neonConfig.pipelineConnect = true;
neonConfig.webSocketPingInterval = 15_000; // 15 seconds

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
