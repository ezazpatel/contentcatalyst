import { useQuery } from "@tanstack/react-query";
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
import { Loader2, RefreshCw } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { apiRequest } from "@/utils/api";
import { QueryClient } from "@tanstack/react-query";
// Added imports for DropdownMenu components and toast


export default function BlogsList() {
  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/posts"],
  });

  const regenerateMutation = useMutation({
    mutationKey: ['regeneratePost'],
    mutationFn: (postId: string) => fetch(`/api/posts/${postId}/regenerate`, { method: 'POST' }),
  });

  const { toast } = useToast();
  const queryClient = new QueryClient(); // Initialize QueryClient

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
            <Card key={post.id} className="h-full transition-colors">
                <Link href={`/view/${post.id}`}>
                  <div className="cursor-pointer hover:bg-accent/40">
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
                    <CardContent>
                      <div className="text-sm text-muted-foreground mb-4 line-clamp-3">
                        {post.excerpt || post.content.slice(0, 150) + "..."}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className={`px-2 py-1 rounded-full ${
                          post.status === "published" 
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {post.status === "published" ? "Published" : "Draft"}
                        </span>
                      </div>
                    </CardContent>
                  </div>
                </Link>
                <CardFooter className="pt-2 pb-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full flex gap-2 items-center"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      regenerateMutation.mutate(post.id);
                    }}
                    disabled={regenerateMutation.isPending && regenerateMutation.variables === post.id}
                  >
                    {regenerateMutation.isPending && regenerateMutation.variables === post.id ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3 w-3" />
                        Regenerate
                      </>
                    )}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem 
                        onClick={() => navigate(`/edit/${post.id}`)}
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => navigate(`/view/${post.id}`)}
                      >
                        View
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={async () => {
                          try {
                            const response = await apiRequest("POST", `/api/posts/${post.id}/process`);
                            const result = await response.json();
                            toast({
                              title: "Success",
                              description: "Post processed successfully",
                            });
                            queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
                          } catch (error) {
                            toast({
                              title: "Error",
                              description: error instanceof Error ? error.message : "Failed to process post",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        Generate Content
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => deletePost.mutate(post.id)}
                        className="text-red-600"
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardFooter>
              </Card>
          ))}
        </div>
      </div>
    </div>
  );
}