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
            {posts && posts.length > 0 && (
              <Link href={`/edit/${posts[0].id}`}>
                <Button variant="outline">Edit Latest Post</Button>
              </Link>
            )}
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Keywords</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Scheduled Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {posts?.map((post) => (
              <TableRow key={post.id}>
                <TableCell>{post.keywords.join(", ")}</TableCell>
                <TableCell>{post.title || "Untitled"}</TableCell>
                <TableCell>
                  {format(new Date(post.scheduledDate), "PPP")}
                </TableCell>
                <TableCell>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      post.status === "published"
                        ? "bg-green-100 text-green-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {post.status}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Link href={`/view/${post.id}`}>
                      <Button variant="outline" size="sm">View Post</Button>
                    </Link>
                    <Link href={`/edit/${post.id}`}>
                      <Button variant="secondary" size="sm">Edit Post</Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}