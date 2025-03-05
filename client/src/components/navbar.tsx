import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <nav className="border-b mb-8">
      <div className="container mx-auto py-4">
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
    </nav>
  );
}
