import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { BlogForm } from "@/components/blog-form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { InsertBlogPost } from "@shared/schema";
import { CSVUpload } from "@/components/csv-upload";

export default function NewPost() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create post mutation
  const createPost = useMutation({
    mutationFn: async (data: InsertBlogPost) => {
      // Validate that the scheduled date is in the future
      if (!data.scheduledDate || data.scheduledDate < new Date()) {
        toast({
          title: "Invalid scheduled date",
          description: "The scheduled date must be in the future",
          variant: "destructive",
        });
        throw new Error("Invalid date"); // Prevent API call if date is invalid
      }
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
    description: "",
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Create New Post</h1>
        <CSVUpload 
          onUpload={(data) => {
            // Handle bulk uploads
            data.forEach(post => createPost.mutate(post));
          }} 
        />
      </div>
      <div className="grid gap-8">
        <BlogForm
          defaultValues={defaultValues}
          onSubmit={(data) => {
            const updatedData = {...data, keywords: data.keywords.filter(k => k.trim())};
            createPost.mutate(updatedData as InsertBlogPost);
          }}
          isLoading={createPost.isPending}
        />
      </div>
    </div>
  );
}