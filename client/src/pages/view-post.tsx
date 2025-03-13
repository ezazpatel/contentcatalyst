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
  const postId = params?.id ? parseInt(params.id) : null;

  // Always declare all hooks before any conditional returns
  const { data: post, isLoading } = useQuery<BlogPost>({
    queryKey: [`/api/posts/${postId}`],
    // Only fetch if we have a valid postId
    enabled: postId !== null && !isNaN(postId)
  });
  const { toast } = useToast();

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


  if (!postId) {
    navigate("/");
    return null;
  }

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

            {post.affiliateLinks?.length > 0 && (
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
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import type { BlogPost } from "@shared/schema";
import { Navbar } from "@/components/navbar";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit } from "lucide-react";

export default function ViewPost() {
  const [, params] = useRoute<{ id: string }>("/view/:id");
  const [, navigate] = useLocation();
  const postId = params?.id ? parseInt(params.id) : null;

  if (!postId) {
    navigate("/blogs");
    return null;
  }

  const { data: post, isLoading } = useQuery<BlogPost>({
    queryKey: [`/api/posts/${postId}`],
  });

  if (isLoading) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }

  if (!post) {
    return <div className="container mx-auto py-8">Post not found</div>;
  }

  return (
    <div>
      <Navbar />
      <div className="container mx-auto py-8">
        <div className="flex items-center mb-6 gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/blogs")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Posts
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate(`/edit/${post.id}`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit Post
          </Button>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <div className="flex gap-2 mb-2">
                  {post.keywords.map((keyword, i) => (
                    <Badge key={i} variant="secondary">
                      {keyword}
                    </Badge>
                  ))}
                </div>
                <CardTitle className="text-3xl">{post.title}</CardTitle>
              </div>
              <Badge variant={post.status === "published" ? "default" : "outline"}>
                {post.status}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {post.publishedDate
                ? `Published: ${format(new Date(post.publishedDate), "PPP")}`
                : `Scheduled: ${format(new Date(post.scheduledDate), "PPP")}`}
            </div>
          </CardHeader>
          <CardContent>
            <MarkdownRenderer content={post.content} className="mt-6" />
          </CardContent>
        </Card>

        {post.wordpressUrl && (
          <div className="bg-muted p-4 rounded-md">
            <p className="font-semibold">Published to WordPress:</p>
            <a 
              href={post.wordpressUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline break-all"
            >
              {post.wordpressUrl}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
