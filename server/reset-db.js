
// This is a simple wrapper to execute the TypeScript file using tsx
import { exec } from 'child_process';

console.log("Running database reset script...");
exec('npx tsx server/reset-db.ts', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`);
    return;
  }
  if (stderr) {
    console.error(`Stderr: ${stderr}`);
    return;
  }
  console.log(stdout);
});
