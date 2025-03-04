import { useQuery, useMutation } from "@tanstack/react-query";
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

export default function EditPost() {
  const [, params] = useRoute<{ id: string }>("/edit/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const isNew = !params?.id;

  const { data: post, isLoading } = useQuery<BlogPost>({
    queryKey: ["/api/posts", params?.id],
    enabled: !isNew,
  });

  const updatePost = useMutation({
    mutationFn: async (data: InsertBlogPost) => {
      const response = await (isNew
        ? apiRequest("POST", "/api/posts", data)
        : apiRequest("PATCH", `/api/posts/${params?.id}`, data));
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Post saved successfully",
      });
      navigate("/"); // Redirect to dashboard after successful save
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save post",
        variant: "destructive",
      });
    },
  });

  const generateAIContent = async (keywords: string[]) => {
    try {
      const [content, title, description] = await Promise.all([
        generateContent(keywords),
        generateSEOTitle(keywords),
        generateMetaDescription(keywords),
      ]);

      updatePost.mutate({
        title: title,
        content,
        keywords,
        affiliateLinks: post?.affiliateLinks || [],
        scheduledDate: post?.scheduledDate || new Date(),
        status: post?.status || "draft",
        seoTitle: title,
        seoDescription: description,
        headings: [],
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate content",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
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
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">
        {isNew ? "New Post" : "Edit Post"}
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
            value={post?.seoTitle || ""}
            onChange={(e) =>
              updatePost.mutate({ ...defaultValues, seoTitle: e.target.value })
            }
          />

          <Textarea
            placeholder="SEO Description"
            value={post?.seoDescription || ""}
            onChange={(e) =>
              updatePost.mutate({ ...defaultValues, seoDescription: e.target.value })
            }
          />

          <RichEditor
            value={post?.content || ""}
            onChange={(content) => updatePost.mutate({ ...defaultValues, content })}
          />
        </div>
      </div>
    </div>
  );
}