import { useQuery } from "@tanstack/react-query";
import { BlogPost } from "@shared/schema";
import { format } from "date-fns";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
} from "@/components/ui/card";
import { Link } from "wouter";
import { useLocalStorage } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useNavigate } from "react-router-dom";


export default function BlogsList() {
  const navigate = useNavigate();
  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/posts"],
  });
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [testMode, setTestMode] = useLocalStorage("testMode", false);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Sort posts by scheduledDate, latest first
  const sortedPosts = [...(posts || [])].sort((a, b) => {
    const dateA = new Date(a.scheduledDate || 0);
    const dateB = new Date(b.scheduledDate || 0);
    return dateB.getTime() - dateA.getTime();
  });

  const hasUnpublishedPosts = posts?.some((post) => post.status === "draft");
  const unpublishedPosts = posts?.filter((post) => post.status === "draft");


  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Blog Posts</h1>
        <div className="flex gap-2">
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
            {!testMode && hasUnpublishedPosts && (
              <Button onClick={() => setIsPublishDialogOpen(true)}>
                Publish to WordPress ({unpublishedPosts.length})
              </Button>
            )}
          </div>
          <Button onClick={() => navigate("/blogs/new")}>Create New Post</Button>
        </div>
      </div>
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
  );
}