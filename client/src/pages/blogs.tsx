import { useState } from "react";
import { useNavigate } from "wouter";
import { apiRequest } from "../lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../components/ui/button";
import { useToast } from "../hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import type { BlogPost } from "@shared/schema";
import { Trash2, Edit, ExternalLink } from "lucide-react";

export default function BlogsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);

  // Fetch all blog posts
  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/posts"],
  });

  // Calculate unpublished posts count (posts with content but not published to WordPress)
  const unpublishedPosts = posts?.filter(
    (post) =>
      post.status === "published" &&
      post.content &&
      post.content.length > 100 &&
      !post.wordpressUrl
  ) || [];

  const hasUnpublishedPosts = unpublishedPosts.length > 0;

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

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-slate-500";
      case "scheduled":
        return "bg-yellow-500";
      case "published":
        return "bg-green-500";
      default:
        return "bg-slate-500";
    }
  };

  if (isLoading) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Blog Posts</h1>
        <Button onClick={() => navigate("/blogs/new")}>Create New Post</Button>
      </div>

      {posts && posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="border rounded-lg p-4 bg-card"
            >
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex-grow">
                  <h2 className="text-lg font-semibold mb-2">{post.title}</h2>
                  <div className="flex flex-wrap gap-2 items-center text-sm text-gray-500">
                    <span>
                      Created: {formatDate(post.createdAt)}
                    </span>
                    <Badge className={getStatusColor(post.status)}>
                      {post.status}
                    </Badge>
                    {post.wordpressUrl && (
                      <Badge variant="outline">
                        <a
                          href={post.wordpressUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1"
                        >
                          WordPress <ExternalLink className="h-3 w-3" />
                        </a>
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 items-start">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/blogs/${post.id}`)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                      setSelectedPostId(post.id);
                      setIsDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">No blog posts found.</p>
          <Button onClick={() => navigate("/blogs/new")} className="mt-4">
            Create Your First Post
          </Button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedPostId) {
                  deletePost.mutate(selectedPostId);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}