import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BlogPost } from "@shared/schema";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "wouter";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function BlogsList() {
  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/posts"],
  });
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Delete post mutation
  const deletePost = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/posts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      toast({
        title: "Success",
        description: "Post deleted successfully",
      });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete post",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }

  // Sort posts by scheduledDate, latest first
  const sortedPosts = [...(posts || [])].sort((a, b) => {
    const dateA = new Date(a.scheduledDate || 0);
    const dateB = new Date(b.scheduledDate || 0);
    return dateB.getTime() - dateA.getTime();
  });

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Blog Posts</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {sortedPosts.map((post) => (
          <Card key={post.id} className="group relative">
            {/* Delete button - Always visible but only on non-published posts */}
            {post.status !== "published" && (
              <div className="absolute top-4 right-4 z-10">
                <Button
                  variant="destructive"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedPostId(post.id);
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* Card content */}
            <Link href={`/view/${post.id}`}>
              <div className="p-6 cursor-pointer hover:bg-accent/50 transition-colors h-full">
                <div className="text-sm text-muted-foreground mb-2">
                  Keywords: {post.keywords.join(", ")}
                </div>
                <CardTitle className="line-clamp-2 mb-4">{post.title || "Untitled Post"}</CardTitle>
                <div className="text-sm text-muted-foreground mb-4 line-clamp-3">
                  {post.excerpt || (post.content?.slice(0, 150) + "...")}
                </div>
                <div className="text-xs text-muted-foreground">
                  {post.status === "published" ? "Published" : "Scheduled"}: {format(new Date(post.scheduledDate || new Date()), "PPP")}
                </div>
              </div>
            </Link>
          </Card>
        ))}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedPostId) {
                  deletePost.mutate(selectedPostId);
                }
              }}
              disabled={deletePost.isPending}
            >
              {deletePost.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}