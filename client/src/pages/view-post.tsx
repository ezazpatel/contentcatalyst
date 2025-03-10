import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { BlogPost } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ViewPost() {
  const [, params] = useRoute<{ id: string }>("/view/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const postId = params?.id ? parseInt(params.id) : null;

  if (!postId) {
    navigate("/blogs");
    return null;
  }

  const { data: post, isLoading } = useQuery<BlogPost>({
    queryKey: [`/api/posts/${postId}`],
  });

  const republishToWordPress = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/wordpress/publish", post);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Post republished to WordPress successfully",
      });
      // If there's a WordPress URL in the response, you could open it in a new tab
      if (data.postUrl) {
        window.open(data.postUrl, '_blank');
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to republish to WordPress",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }

  if (!post) {
    return <div className="container mx-auto py-8">Post not found. <Button onClick={() => navigate("/blogs")}>Back to Posts</Button></div>;
  }

  return (
    <div>
      <Navbar />
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <div className="text-sm text-muted-foreground mb-2">
                  Keyword Phrases: {post.keywords.join(", ")}
                </div>
                <CardTitle className="text-3xl">{post.title}</CardTitle>
              </div>
              <div className="flex gap-4">
                <Button variant="outline" onClick={() => navigate("/blogs")}>
                  Back to Posts
                </Button>
                <Button 
                  variant="secondary"
                  onClick={() => republishToWordPress.mutate()}
                  disabled={republishToWordPress.isPending}
                >
                  {republishToWordPress.isPending ? "Publishing..." : "Republish to WordPress"}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              <div dangerouslySetInnerHTML={{ __html: post.content }} />
            </div>

            {post.affiliateLinks.length > 0 && (
              <div className="mt-8 border-t pt-4">
                <h3 className="text-lg font-medium mb-2">Related Links</h3>
                <ul className="list-disc pl-5">
                  {post.affiliateLinks.map((link, index) => (
                    <li key={index}>
                      <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {link.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-8 text-sm text-muted-foreground">
              <p>Status: {post.status}</p>
              <p>Scheduled: {format(new Date(post.scheduledDate), "PPP")}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}