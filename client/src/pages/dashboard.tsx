import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BlogPost, InsertBlogPost } from "@shared/schema";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { CSVUpload } from "@/components/csv-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/posts"],
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createPosts = useMutation({
    mutationFn: async (posts: InsertBlogPost[]) => {
      const results = [];
      for (const post of posts) {
        try {
          const response = await apiRequest("POST", "/api/posts", post);
          const result = await response.json();
          results.push(result);
        } catch (error) {
          console.error("Error creating post:", error);
          throw new Error(`Failed to create post with keywords: ${post.keywords.join(", ")}`);
        }
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Success",
        description: "Successfully created posts from CSV",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
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
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Blog Dashboard</h1>
        <div className="flex gap-4">
          <CSVUpload 
            onUpload={(data) => {
              // Ensure data is properly typed as InsertBlogPost[]
              const typedData = data as InsertBlogPost[];
              createPosts.mutate(typedData);
            }} 
          />
          <Link href="/">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {sortedPosts.map((post) => (
          <Link key={post.id} href={`/view/${post.id}`}>
            <Card className="cursor-pointer hover:bg-accent h-full">
              <CardHeader>
                <CardTitle>{post.title || "Untitled Post"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Keywords: {post.keywords.join(", ")}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  {post.scheduledDate && (
                    <>Scheduled: {format(new Date(post.scheduledDate), "PPP")}</>
                  )}
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
  );
}