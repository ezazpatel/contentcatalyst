import { useRoute, useLocation } from "wouter";
import Editor from "./editor";

export default function EditPost() {
  const [, params] = useRoute<{ id: string }>("/edit/:id");
  const [, navigate] = useLocation();
  const postId = params?.id ? parseInt(params.id) : null;

  if (!postId) {
    navigate("/blogs");
    return null;
  }

  return <Editor />;
}