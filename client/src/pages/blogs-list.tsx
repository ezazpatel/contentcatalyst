import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BlogPost } from "@shared/schema";
import { format } from "date-fns";
import { Navbar } from "@/components/navbar";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function BlogsList() {
  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/posts"],
  });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const regeneratePost = useMutation({
    mutationFn: async (postId: number) => {
      return await apiRequest("POST", `/api/posts/${postId}/regenerate`, {});
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Post has been regenerated and published",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to regenerate post: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 sm:px-6 py-8">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-8">Blog Posts</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts?.map((post) => (
            <Card key={post.id} className="flex flex-col h-full">
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  {post.keywords.map((keyword, index) => (
                    <span key={index} className="bg-secondary px-2 py-1 rounded-full text-xs">
                      {keyword}
                    </span>
                  ))}
                </div>
                <CardTitle className="line-clamp-2">
                  {post.title || "Untitled Post"}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {post.excerpt || post.content.slice(0, 150) + "..."}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={`px-2 py-1 rounded-full ${
                    post.status === "published" 
                      ? "bg-green-100 text-green-800" 
                      : "bg-blue-100 text-blue-800"
                  }`}>
                    {post.status === "published" ? "Published" : "Scheduled"}
                  </span>
                  <span>{format(new Date(post.scheduledDate), "PPP")}</span>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between items-center">
                <Link href={`/view/${post.id}`}>
                  <Button variant="outline">View</Button>
                </Link>
                <Button
                  variant="secondary"
                  onClick={() => regeneratePost.mutate(post.id)}
                  disabled={regeneratePost.isPending && regeneratePost.variables === post.id}
                >
                  {regeneratePost.isPending && regeneratePost.variables === post.id ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  Regenerate
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}