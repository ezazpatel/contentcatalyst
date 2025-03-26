import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { BlogPost } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Link } from "wouter";

export default function ViewPost() {
  const [match, params] = useRoute<{ id: string }>("/view/:id");
  const { toast } = useToast();

  const { data: post, isLoading } = useQuery<BlogPost>({
    queryKey: ["/api/posts", params?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/posts/${params?.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch post");
      }
      return response.json();
    },
    enabled: !!params?.id,
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch post",
        variant: "destructive",
      });
    },
  });

  if (!match) {
    return <Link href="/blogs">Redirecting to blogs...</Link>;
  }

  if (isLoading) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }

  if (!post) {
    return (
      <div className="container mx-auto py-8">
        Post not found. <Link href="/blogs"><Button>Back to Posts</Button></Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">{post.title}</h1>
        <div className="flex gap-2">
          {post.status === "published" && (
            <Button 
              onClick={async () => {
                try {
                  const response = await apiRequest("POST", "/api/wordpress/publish", post);
                  if (!response.ok) {
                    throw new Error("Failed to publish to WordPress");
                  }
                  const result = await response.json();
                  toast({
                    title: "Success",
                    description: "Post published to WordPress successfully",
                  });
                } catch (error) {
                  toast({
                    title: "Error",
                    description: error.message || "Failed to publish to WordPress",
                    variant: "destructive",
                  });
                }
              }}
            >
              Republish to WordPress
            </Button>
          )}
          <Link href="/blogs">
            <Button variant="outline">Back to Posts</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="prose prose-lg max-w-none">
            <MarkdownRenderer 
              content={post.content.replace(/^#\s+.*\n/, '')} 
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}