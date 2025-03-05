import { useRoute, useLocation } from "wouter";
import { Navbar } from "@/components/navbar";
import Editor from "./editor";

export default function EditPost() {
  const [, params] = useRoute<{ id: string }>("/edit/:id");
  const [, navigate] = useLocation();
  const postId = params?.id ? parseInt(params.id) : null;

  // Render null only after hooks are called
  if (!postId) {
    return (
      <div>
        <Navbar />
        <div className="container mx-auto py-8">
          <div className="text-center">
            <p>Invalid post ID. Redirecting...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />
      <Editor postId={postId} />
    </div>
  );
}