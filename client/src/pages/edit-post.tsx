
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { BlogForm } from "@/components/blog-form";
import { RichEditor } from "@/components/rich-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { BlogPost, InsertBlogPost } from "@shared/schema";
import { Navbar } from "@/components/navbar";

export default function EditPost() {
  const [, params] = useRoute<{ id: string }>("/edit/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const postId = params?.id ? parseInt(params.id) : null;

  // Fetch the post data
  const { data: post, isLoading } = useQuery<BlogPost>({
    queryKey: ["/api/posts", postId],
    queryFn: () => apiRequest("GET", `/api/posts/${postId}`),
    enabled: !!postId,
  });

  // Update post mutation
  const updatePost = useMutation({
    mutationFn: async (data: Partial<InsertBlogPost>) => {
      if (postId) {
        return await apiRequest("PATCH", `/api/posts/${postId}`, data);
      } else {
        return await apiRequest("POST", "/api/posts", data);
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: postId ? "Post updated successfully" : "Post created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      navigate("/blogs");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to save post: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Generate AI content
  const generateAIContent = async (keywords: string[]) => {
    if (!keywords.length) {
      toast({
        title: "Error",
        description: "Please add at least one keyword",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest("POST", "/api/generate", {
        keywords,
        type: "content"
      });
      
      updatePost.mutate({
        ...post,
        content: response.content,
      });
      
      toast({
        title: "Success",
        description: "Content generated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading && postId) {
    return <div>Loading...</div>;
  }

  // Ensure scheduledDate is always a valid Date
  let scheduledDate;
  try {
    scheduledDate = post?.scheduledDate ? new Date(post.scheduledDate) : new Date();
    // Check if date is valid
    if (isNaN(scheduledDate.getTime())) {
      scheduledDate = new Date(); // Fallback to current date if invalid
    }
  } catch (err) {
    scheduledDate = new Date(); // Fallback to current date on error
  }

  const defaultValues: Partial<InsertBlogPost> = {
    title: post?.title || "",
    content: post?.content || "",
    keywords: post?.keywords || [""],
    affiliateLinks: post?.affiliateLinks || [{ name: "", url: "" }],
    scheduledDate: scheduledDate,
    status: post?.status || "draft",
    seoTitle: post?.seoTitle || "",
    seoDescription: post?.seoDescription || "",
    headings: post?.headings || [],
  };

  return (
    <div>
      <Navbar />
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">
          {postId ? "Edit Post" : "Create New Post"}
        </h1>

        <div className="grid gap-8">
          <BlogForm
            defaultValues={defaultValues}
            onSubmit={(data) => updatePost.mutate(data)}
            isLoading={updatePost.isPending}
          />

          <div className="space-y-4">
            <h2 className="text-2xl font-bold">Content</h2>

            <div className="flex gap-4 mb-4">
              <Button
                onClick={() => generateAIContent(defaultValues.keywords || [])}
                disabled={updatePost.isPending}
              >
                Generate AI Content
              </Button>
            </div>

            <Input
              placeholder="SEO Title"
              value={defaultValues?.seoTitle || ""}
              onChange={(e) =>
                updatePost.mutate({ ...defaultValues, seoTitle: e.target.value })
              }
            />

            <Textarea
              placeholder="SEO Description"
              value={defaultValues?.seoDescription || ""}
              onChange={(e) =>
                updatePost.mutate({ ...defaultValues, seoDescription: e.target.value })
              }
            />

            <RichEditor
              value={defaultValues?.content || ""}
              onChange={(content) => updatePost.mutate({ ...defaultValues, content })}
            />
          </div>

          <div className="flex justify-end space-x-4 mt-4">
            <Button variant="outline" onClick={() => navigate("/blogs")}>
              Cancel
            </Button>
            <Button variant="default" onClick={() => navigate("/blogs")}>
              Save and Exit
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
