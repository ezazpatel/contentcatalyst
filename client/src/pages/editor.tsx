import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { RichEditor } from "@/components/rich-editor";
import type { BlogPost } from "@shared/schema";
import { Navbar } from "@/components/navbar";

export default function Editor() {
  const [, params] = useRoute<{ id: string }>("/edit/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const postId = params?.id ? parseInt(params.id) : null;

  if (!postId) {
    navigate("/blogs");
    return null;
  }

  const { data: post, isLoading } = useQuery<BlogPost>({
    queryKey: [`/api/posts/${postId}`],
  });

  const updatePost = useMutation({
    mutationFn: async (data: Partial<BlogPost>) => {
      const response = await apiRequest("PATCH", `/api/posts/${postId}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Post updated successfully",
      });

      // Invalidate and refetch queries
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update post",
        variant: "destructive",
      });
    },
  });

  const publishToWordPress = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/wordpress/publish", post);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Post published to WordPress successfully",
      });
      updatePost.mutate({ status: "published" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to publish to WordPress",
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
    <div className="flex flex-col min-h-screen"> {/* Added flexbox for layout */}
      <Navbar />
      <div className="container mx-auto py-8 px-4 flex-grow"> {/* Added padding and flex-grow */}
        <h1 className="text-3xl font-bold mb-8 text-center sm:text-left">Edit Post</h1> {/* Centered title for smaller screens */}
        <div className="w-full max-w-3xl mx-auto"> {/* Contained width for better responsiveness */}
          <RichEditor
            title={post.title}
            content={post.content}
            seoTitle={post.seoTitle || ""}
            seoDescription={post.seoDescription || ""}
            metaTags={post.metaTags || []}
            slug={post.slug || ""}
            onTitleChange={(title) => updatePost.mutate({ title })}
            onContentChange={(content) => updatePost.mutate({ content })}
            onSEOTitleChange={(seoTitle) => updatePost.mutate({ seoTitle })}
            onSEODescriptionChange={(seoDescription) => updatePost.mutate({ seoDescription })}
            onMetaTagsChange={(metaTags) => updatePost.mutate({ metaTags })}
            onSlugChange={(slug) => updatePost.mutate({ slug })}
          />

          <div className="mt-8 flex flex-wrap gap-4 justify-center sm:justify-start"> {/* Responsive button placement */}
            <Button onClick={() => (window.location.href = "/blogs")}>Back to Posts</Button>
            <Button
              variant="destructive"
              onClick={() => publishToWordPress.mutate()}
              disabled={publishToWordPress.isPending}
            >
              {publishToWordPress.isPending ? "Publishing..." : "Publish to WordPress"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}