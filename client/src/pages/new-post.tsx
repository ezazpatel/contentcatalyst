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
import { Navbar } from "@/components/navbar";

export default function NewPost() {
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
      navigate("/blogs"); // Redirect to blogs list after successful save
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save post",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  const defaultValues: InsertBlogPost = {
    title: post?.title || "",
    content: post?.content || "",
    keywords: post?.keywords || [""],
    affiliateLinks: post?.affiliateLinks || [{ name: "", url: "" }],
    scheduledDate: post?.scheduledDate ? new Date(post.scheduledDate) : new Date(),
    status: post?.status || "draft",
    seoTitle: post?.seoTitle || "",
    seoDescription: post?.seoDescription || "",
    headings: post?.headings || [],
  };

  return (
    <div>
      <Navbar />
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">{isNew ? "Create New Post" : "Edit Post"}</h1>
        <div className="grid gap-8">
          <BlogForm
            defaultValues={defaultValues}
            onSubmit={(data) => updatePost.mutate(data)}
            isLoading={updatePost.isPending}
          />
        </div>
      </div>
    </div>
  );
}