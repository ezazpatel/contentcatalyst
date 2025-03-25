
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export function Navbar() {
  return (
    <nav className="border-b mb-8">
      <div className="container mx-auto py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-1">Dashboard</h1>
            <p className="text-xl text-muted-foreground">Canada Things to Do</p>
          </div>
          <div className="flex gap-4">
            <Link href="/">
              <Button variant="outline">Create New Post</Button>
            </Link>
            <Link href="/blogs">
              <Button variant="outline">View All Posts</Button>
            </Link>
            <Link href="/keywords">
              <Button variant="outline">Manage Keywords</Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
import { useLocalStorage } from "@/lib/hooks";
import { Button } from "./ui/button";

export function Navbar() {
  const [testMode, setTestMode] = useLocalStorage("testMode", false);
  
  return (
    <nav className="border-b py-3 px-4">
      <div className="container mx-auto flex justify-between items-center">
        <div className="text-lg font-bold">Blog Manager</div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={testMode}
              onChange={(e) => setTestMode(e.target.checked)}
              className="h-4 w-4"
            />
            Test Mode
          </label>
        </div>
      </div>
    </nav>
  );
}
