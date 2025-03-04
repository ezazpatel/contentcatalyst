import { useQuery } from "@tanstack/react-query";
import { BlogPost } from "@shared/schema";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Navbar } from "@/components/navbar";

export default function BlogsList() {
  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/posts"],
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <Navbar />
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Blog Posts</h1>
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
    </div>
  );
}