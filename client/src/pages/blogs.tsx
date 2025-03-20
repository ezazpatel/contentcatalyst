import { useState } from "react";
import { useNavigate } from "wouter";
import { apiRequest } from "../lib/api";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "../components/ui/button";
import { toast } from "../components/ui/use-toast";
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

export default function BlogsPage() {
  const navigate = useNavigate();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);

  // Fetch all blog posts
  const { data: posts, isLoading, refetch } = useQuery<BlogPost[]>({
    queryKey: ["blog-posts"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/posts");
      return response.json();
    },
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
      toast({
        title: "Success",
        description: "Post deleted successfully",
      });
      refetch();
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

  // Publish all unpublished posts to WordPress
  const publishToWordPress = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/wordpress/publish-all");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "WordPress Publishing",
        description: data.message || "Started publishing posts to WordPress",
      });
      setIsPublishDialogOpen(false);

      // Refetch after a delay to show updated status
      setTimeout(() => {
        refetch();
      }, 3000);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to publish to WordPress",
        variant: "destructive",
      });
      setIsPublishDialogOpen(false);
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
        <div className="flex gap-2">
          {hasUnpublishedPosts && (
            <Button
              onClick={() => setIsPublishDialogOpen(true)}
              variant="outline"
            >
              Publish to WordPress ({unpublishedPosts.length})
            </Button>
          )}
          <Button onClick={() => navigate("/blogs/new")}>Create New Post</Button>
        </div>
      </div>

      {posts && posts.length > 0 ? (
        <div className="space-y-4">
          {posts.map((post) => (
            <div
              key={post.id}
              className="border rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-semibold">
                    {post.title || "Untitled Post"}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Keywords: {post.keywords?.join(", ") || "None"}
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Badge className={getStatusColor(post.status)}>
                      {post.status}
                    </Badge>
                    {post.scheduledDate && (
                      <Badge variant="outline">
                        Scheduled: {formatDate(post.scheduledDate)}
                      </Badge>
                    )}
                    {post.publishedDate && (
                      <Badge variant="outline">
                        Published: {formatDate(post.publishedDate)}
                      </Badge>
                    )}
                    {post.wordpressUrl && (
                      <Badge variant="outline" className="bg-blue-100">
                        <a
                          href={post.wordpressUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center"
                        >
                          WordPress ↗
                        </a>
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/blogs/${post.id}`)}
                  >
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

      {/* WordPress Publish Confirmation Dialog */}
      <Dialog open={isPublishDialogOpen} onOpenChange={setIsPublishDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish to WordPress</DialogTitle>
            <DialogDescription>
              This will publish {unpublishedPosts.length}{" "}
              post{unpublishedPosts.length !== 1 ? "s" : ""} to WordPress that
              have been processed but not yet published.
              <br />
              <br />
              Posts will be published one at a time with a delay in between to
              avoid overloading your WordPress site.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPublishDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={() => {
                publishToWordPress.mutate();
              }}
            >
              Publish All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}