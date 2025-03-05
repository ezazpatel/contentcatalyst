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

export default function KeywordsList() {
  const { data: posts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/posts"],
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  // Create a map of keywords to their associated posts
  const keywordMap = new Map();
  posts?.forEach((post) => {
    post.keywords.forEach((keyword) => {
      if (!keywordMap.has(keyword)) {
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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Manage Keywords</h1>
          <div className="flex space-x-4">
            <Link href="/new">
              <Button>New Post</Button>
            </Link>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Keyword</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Blog Title</TableHead>
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
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        isPublished
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {isPublished ? "Published" : isScheduled ? "Scheduled" : "Draft"}
                    </span>
                  </TableCell>
                  <TableCell>
                    {entry.publishDate ? format(entry.publishDate, "PPP 'at' p") : "Not set"}
                  </TableCell>
                  <TableCell>{entry.blogTitle || "Not created"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}