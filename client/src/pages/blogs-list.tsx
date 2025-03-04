import { useQuery } from "@tanstack/react-query";
import { BlogPost } from "@shared/schema";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { format } from "date-fns";

export default function BlogsList() {
  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/posts"],
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Blog Posts</h1>
        <div className="flex gap-4">
          <Link href="/">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {posts?.map((post) => (
          <Link key={post.id} href={`/edit/${post.id}`}>
            <Card className="cursor-pointer hover:bg-accent">
              <CardHeader>
                <CardTitle>{post.title || "Untitled Post"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Keywords: {post.keywords.join(", ")}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  Scheduled: {format(new Date(post.scheduledDate), "PPP")}
                </div>
                <div className="text-sm font-medium mt-2">
                  Status: {post.status}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
