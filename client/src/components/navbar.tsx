
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

export function Navbar() {
  return (
    <nav className="border-b mb-8">
      <div className="container mx-auto py-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Canada Things to Do</p>
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
            <Link href="/bulk-upload">
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Upload
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
