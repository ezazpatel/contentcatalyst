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
import { Navbar } from "@/components/navbar";

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
          publishDate: new Date(post.scheduledDate),
          blogTitle: post.title,
          blogId: post.id,
        });
      }
    });
  });

  const keywords = Array.from(keywordMap.values());
  const now = new Date();

  return (
    <div>
      <Navbar />
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Keywords Overview</h1>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Keyword</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Blog Title</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keywords.map((entry) => {
              const isPublished = entry.status === "published";
              const isScheduled = !isPublished && entry.publishDate && entry.publishDate > now;

              return (
                <TableRow key={entry.keyword}>
                  <TableCell>{entry.keyword}</TableCell>
                  <TableCell>
                    {isPublished ? "Published" : isScheduled ? "Scheduled" : "Draft"}
                  </TableCell>
                  <TableCell>
                    {entry.publishDate ? format(entry.publishDate, "PPP 'at' p") : "Not set"}
                  </TableCell>
                  <TableCell>{entry.blogTitle || "Not created"}</TableCell>
                  <TableCell>
                    {entry.blogId ? (
                      <Link href={`/edit/${entry.blogId}`}>
                        <Button variant="outline" size="sm">
                          View Post
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
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}