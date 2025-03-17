import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { BlogPost } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link } from "wouter";

export default function ViewPost() {
  const [match, params] = useRoute<{ id: string }>("/view/:id");
  const postId = params?.id ? parseInt(params.id) : null;

  const { data: post, isLoading } = useQuery<BlogPost>({
    queryKey: [`/api/posts/${postId}`],
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
                <Link href="/blogs">
                  <Button variant="outline">Back to Posts</Button>
                </Link>
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
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {post.content}
              </ReactMarkdown>
            </div>

            {post.affiliateLinks && post.affiliateLinks.length > 0 && (
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
              {post.scheduledDate && (
                <p>Scheduled: {format(new Date(post.scheduledDate), "PPP")}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
import { Helmet } from "react-helmet";

// ... other imports

export default function ViewPost() {
  // ... existing component code

  return (
    <>
      <Helmet>
        <meta name="robots" content="noindex" />
      </Helmet>
      {/* rest of your component JSX */}
    </>
  );
}
