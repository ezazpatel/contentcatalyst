import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { BlogPost } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { MarkdownRenderer } from "@/components/markdown-renderer";
import { Link } from "wouter";

export default function ViewPost() {
  const [match, params] = useRoute<{ id: string }>("/view/:id");
  const { toast } = useToast();

  const { data: post, isLoading } = useQuery<BlogPost>({
    queryKey: ["/api/posts", params?.id],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/posts/${params?.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch post");
      }
      const data = await response.json();
      console.log('[View Post Debug] Received post data:', {
        id: data.id,
        affiliateImages: data.affiliateImages
      });
      return data;
    },
    enabled: !!params?.id,
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch post",
        variant: "destructive",
      });
    },
  });

  if (!match) {
    return <Link href="/blogs">Redirecting to blogs...</Link>;
  }

  if (isLoading) {
    return <div className="container mx-auto py-8">Loading...</div>;
  }

  console.log('ViewPost: Query state:', { isLoading, post: post?.id });

  if (!post) {
    console.log('ViewPost: No post found');
    return (
      <div className="container mx-auto py-8">
        Post not found. <Link href="/blogs"><Button>Back to Posts</Button></Link>
      </div>
    );
  }

  const imageMatches = post.content?.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || [];

  console.log('[Image Debug]', {
    postId: post.id,
    title: post.title,
    totalImages: imageMatches.length,
    images: imageMatches.map(img => {
      const match = img.match(/!\[([^\]]*)\]\(([^)]*)\)/);
      if (!match) return null;
      return {
        alt: match[1],
        url: match[2],
        raw: img
      };
    }).filter(Boolean),
    affiliateImages: post.affiliateImages?.length || 0,
    affiliateImagesData: post.affiliateImages // Log the full affiliate images data
  });

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">{post.title}</h1>
        <Link href="/blogs">
          <Button variant="outline">Back to Posts</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="prose prose-lg max-w-none prose-img:max-w-full prose-img:mx-auto prose-img:rounded-lg">
            <MarkdownRenderer
              content={post.content.replace(/^#\s+.*\n/, '')}
              affiliateImages={post.affiliateImages}
            />
          </div>

          {post.affiliateImages && post.affiliateImages.length > 0 && (
            <div className="mt-8 border-t pt-4">
              <h3 className="text-xl font-semibold mb-2">Affiliate Image Data ({post.affiliateImages.length} images)</h3>
              <ul className="list-disc pl-5 space-y-4">
                {post.affiliateImages.map((img: any, index: number) => (
                  <li key={index} className="text-sm text-gray-600">
                    <div className="grid gap-1">
                      <div><strong>Image URL:</strong> {img.url || 'Not available'}</div>
                      <div><strong>Affiliate URL:</strong> {img.affiliateUrl || 'Not available'}</div>
                      <div><strong>Heading:</strong> {img.heading || 'Not available'}</div>
                      <div><strong>Alt Text:</strong> {img.alt || 'Not available'}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}