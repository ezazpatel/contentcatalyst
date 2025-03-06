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
        description: "Post scheduled successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      navigate("/blogs");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to schedule post: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Publish now mutation
  const publishNow = useMutation({
    mutationFn: async (data: InsertBlogPost) => {
      // Set the scheduled date to now and status to "draft" for immediate processing
      const modifiedData = {
        ...data,
        scheduledDate: new Date(),
        status: "draft"
      };
      const response = await apiRequest("POST", "/api/posts", modifiedData);

      // Wait for content generation and publishing
      const postData = await response.json();
      return postData;
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Post published successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
      navigate("/blogs");
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to publish post: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const defaultValues: Partial<InsertBlogPost> = {
    title: "",
    content: "",
    keywords: [""],
    affiliateLinks: [{ name: "", url: "" }],
    scheduledDate: new Date(),
    status: "draft",
    seoTitle: "",
    seoDescription: "",
    headings: [],
    contextDescription: "",
    introLength: 400,
    sectionLength: 600,
    conclusionLength: 300,
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
            onPublishNow={(data) => publishNow.mutate(data as InsertBlogPost)}
            isLoading={createPost.isPending}
            isPublishing={publishNow.isPending}
          />
        </div>
      </div>
    </div>
  );
}