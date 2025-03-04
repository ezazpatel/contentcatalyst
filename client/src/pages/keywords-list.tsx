import { useQuery } from "@tanstack/react-query";
import { BlogPost } from "@shared/schema";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";

type KeywordEntry = {
  keyword: string;
  status: string;
  publishDate: Date | null;
  blogTitle: string | null;
  blogId: number | null;
};

export default function KeywordsList() {
  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/posts"],
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Process posts to get keyword information
  const keywordMap = new Map<string, KeywordEntry>();
  
  posts?.forEach(post => {
    post.keywords.forEach(keyword => {
      if (!keywordMap.has(keyword) || post.status === "published") {
        keywordMap.set(keyword, {
          keyword,
          status: post.status,
          publishDate: post.status === "published" ? new Date(post.scheduledDate) : null,
          blogTitle: post.status === "published" ? post.title : null,
          blogId: post.status === "published" ? post.id : null,
        });
      }
    });
  });

  const keywords = Array.from(keywordMap.values());

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Keywords Overview</h1>
        <Link href="/">
          <Button>Create New Post</Button>
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Keyword</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Publish Date</TableHead>
            <TableHead>Blog Title</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {keywords.map((entry) => (
            <TableRow key={entry.keyword}>
              <TableCell>{entry.keyword}</TableCell>
              <TableCell>{entry.status}</TableCell>
              <TableCell>
                {entry.publishDate ? format(entry.publishDate, "PPP") : "Not published"}
              </TableCell>
              <TableCell>{entry.blogTitle || "N/A"}</TableCell>
              <TableCell>
                {entry.blogId ? (
                  <Link href={`/edit/${entry.blogId}`}>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </Link>
                ) : (
                  <Link href="/">
                    <Button variant="outline" size="sm">
                      Create Post
                    </Button>
                  </Link>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
