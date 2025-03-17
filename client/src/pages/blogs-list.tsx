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
    return <div>Loading...</div>;
  }

  // Sort posts by scheduledDate, latest first
  const sortedPosts = [...(posts || [])].sort((a, b) => {
    const dateA = new Date(a.scheduledDate || 0);
    const dateB = new Date(b.scheduledDate || 0);
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <div>
      <Navbar />
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Blog Posts</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sortedPosts.map((post) => (
            <Link key={post.id} href={`/view/${post.id}`}>
              <Card className="cursor-pointer hover:bg-accent h-full">
                <CardHeader>
                  <div className="text-sm text-muted-foreground mb-2">
                    Keyword Phrases: {post.keywords.join(", ")}
                  </div>
                  <CardTitle className="line-clamp-2">{post.title || "Untitled Post"}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {post.excerpt || (post.content?.slice(0, 150) + "...")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {post.status === "published" ? "Published" : "Scheduled"}: {format(new Date(post.scheduledDate || new Date()), "PPP")}
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