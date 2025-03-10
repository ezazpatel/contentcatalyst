import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { BlogForm } from "@/components/blog-form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { InsertBlogPost } from "@shared/schema";
import { Navbar } from "@/components/navbar";
import { useState } from 'react'; // Added import for useState

export default function NewPost() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<InsertBlogPost>( {
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
    description: "",
  });
  const [formError, setFormError] = useState<string | null>(null);


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
      setFormData({
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
        description: "",
      });
      setFormError(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to create post: ${error.message}`,
        variant: "destructive",
      });
      setFormError(error.message);
    },
  });

  const handleSubmit = (data: InsertBlogPost) => {
    createPost.mutate(data);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value, type, checked } = event.target;
      setFormData(prevData => ({
          ...prevData,
          [name]: type === "checkbox" ? checked : value
      }));
  }

  return (
    <div>
      <Navbar />
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Create New Post</h1>
        <div className="grid gap-8">
          {formError && (
            <div className="bg-red-100 text-red-700 px-4 py-2 rounded-md mb-4">
              {formError}
            </div>
          )}
          <BlogForm
            defaultValues={formData}
            onSubmit={handleSubmit}
            isLoading={createPost.isPending}
            onChange={handleInputChange}
          />
        </div>
      </div>
    </div>
  );
}