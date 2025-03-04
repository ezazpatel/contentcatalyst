import { useQuery, useMutation } from "@tanstack/react-query";
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

  const { data: post, isLoading } = useQuery<BlogPost>({
    queryKey: ["/api/posts", params?.id],
  });

  const updatePost = useMutation({
    mutationFn: async (data: Partial<BlogPost>) => {
      const response = await apiRequest("PATCH", `/api/posts/${params?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Post updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update post",
        variant: "destructive",
      });
    },
  });

  if (isLoading || !post) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <Navbar />
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Edit Post</h1>
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
        
        <div className="mt-8 flex gap-4">
          <Button onClick={() => navigate("/blogs")}>Back to Posts</Button>
          <Button 
            variant="destructive" 
            onClick={() => {
              updatePost.mutate({ status: "published" });
              navigate("/blogs");
            }}
          >
            Publish to WordPress
          </Button>
        </div>
      </div>
    </div>
  );
}
