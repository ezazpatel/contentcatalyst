
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { BlogForm } from "@/components/blog-form";
import { RichEditor } from "@/components/rich-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { generateContent, generateSEOTitle, generateMetaDescription } from "@/lib/mock-ai";
import type { BlogPost, InsertBlogPost } from "@shared/schema";
import { Navbar } from "@/components/navbar";

export default function EditPost() {
  const [, params] = useRoute<{ id: string }>("/edit/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isNew = !params?.id;

  const { data: post, isLoading } = useQuery<BlogPost>({
    queryKey: ["/api/posts", params?.id],
    enabled: !isNew,
  });

  const updatePost = useMutation({
    mutationFn: async (data: Partial<InsertBlogPost>) => {
      if (isNew) {
        const response = await apiRequest("POST", "/api/posts", data);
        return response.json();
      } else {
        const response = await apiRequest("PATCH", `/api/posts/${params?.id}`, data);
        return response.json();
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: `Post ${isNew ? "created" : "updated"} successfully`,
      });
      
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      
      if (isNew) {
        navigate("/keywords");
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || `Failed to ${isNew ? "create" : "update"} post`,
        variant: "destructive",
      });
    },
  });

  const generateAIContent = async (keywords: string[]) => {
    if (!keywords.length) {
      toast({
        title: "Error",
        description: "Please add at least one keyword before generating content",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Generating content",
      description: "This may take a few seconds...",
    });

    try {
      // Generate content and update state
      const content = await generateContent(keywords);
      const seoTitle = await generateSEOTitle(keywords);
      const seoDescription = await generateMetaDescription(keywords);
      
      updatePost.mutate({
        ...post,
        content,
        seoTitle,
        seoDescription,
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate content. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading && !isNew) {
    return <div>Loading...</div>;
  }

  const defaultValues: Partial<InsertBlogPost> = isNew
    ? {
        title: "",
        content: "",
        keywords: [""],
        affiliateLinks: [{ name: "", url: "" }],
        scheduledDate: new Date(),
        status: "draft",
        seoTitle: "",
        seoDescription: "",
        headings: [],
      }
    : post;

  return (
    <div>
      <Navbar />
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">
          {isNew ? "Create New Post" : "Edit Post"}
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
                onClick={() => generateAIContent(post?.keywords || [])}
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
