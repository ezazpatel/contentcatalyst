import { useQuery } from "@tanstack/react-query";
import { BlogPost } from "@shared/schema";
import { format } from "date-fns";
import { Navbar } from "@/components/navbar";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

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
              <Card className="cursor-pointer hover:bg-accent h-full">
                <CardHeader>
                  <div className="text-sm text-muted-foreground mb-2">
                    Keywords: {post.keywords.join(", ")}
                  </div>
                  <CardTitle className="line-clamp-2">{post.title || "Untitled Post"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {post.excerpt || post.content.slice(0, 150) + "..."}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {post.status === "published" ? "Published" : "Scheduled"}: {format(new Date(post.scheduledDate), "PPP")}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button>Edit Post</Button>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}