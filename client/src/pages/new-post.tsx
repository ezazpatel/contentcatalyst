import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { BlogForm } from "@/components/blog-form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { InsertBlogPost } from "@shared/schema";
import { Navbar } from "@/components/navbar";

export default function NewPost() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create post mutation
  const createPost = useMutation({
    mutationFn: async (data: InsertBlogPost) => {
      return await apiRequest("POST", "/api/posts", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Post created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      navigate("/blogs");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create post: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const defaultValues: InsertBlogPost = {
    title: "",
    content: "",
    keywords: [""],
    affiliateLinks: [{ name: "", url: "" }],
    scheduledDate: new Date(),
    status: "draft",
    seoTitle: "",
    seoDescription: "",
    headings: [],
    wordCount: 500,
  };

  return (
    <div>
      <Navbar />
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Create New Post</h1>
        <div className="grid gap-8">
          <BlogForm
            defaultValues={defaultValues}
            onSubmit={(data) => createPost.mutate(data as InsertBlogPost)}
            isLoading={createPost.isPending}
          />
        </div>
      </div>
    </div>
  );
}