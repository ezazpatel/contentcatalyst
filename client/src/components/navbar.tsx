import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <nav className="border-b mb-8">
      <div className="container mx-auto px-4 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <Link href="/blogs">
            <Button variant="outline" className="w-full sm:w-auto">View All Posts</Button>
          </Link>
          <Link href="/keywords">
            <Button variant="outline" className="w-full sm:w-auto">Manage Keywords</Button>
          </Link>
          <Link href="/new">
            <Button variant="outline" className="w-full sm:w-auto">Create New Post</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}