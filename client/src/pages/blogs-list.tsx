import { useQuery } from "@tanstack/react-query";
import { BlogPost } from "@shared/schema";
import { format } from "date-fns";
import { Navbar } from "@/components/navbar";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
} from "@/components/ui/card";
import { Link } from "wouter";

export default function BlogsList() {
  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/posts"],
  });

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  return (
    <div>
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-8">Blog Posts</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts?.map((post) => (
            <Link key={post.id} href={`/view/${post.id}`}>
              <Card className="cursor-pointer hover:bg-accent h-full transition-colors">
                <CardHeader>
                  <div className="text-sm text-muted-foreground mb-2 line-clamp-1">
                    Keywords: {post.keywords.join(", ")}
                  </div>
                  <CardTitle className="line-clamp-2 text-lg sm:text-xl">
                    {post.title || "Untitled Post"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {post.excerpt || post.content.slice(0, 150) + "..."}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {post.status === "published" ? "Published" : "Scheduled"}: {format(new Date(post.scheduledDate), "PPP")}
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