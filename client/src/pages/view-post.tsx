
import { useEffect } from "react";
import { useRoute, useLocation } from "wouter";

export default function ViewPost() {
  const [, params] = useRoute<{ id: string }>("/view/:id");
  const [, navigate] = useLocation();

  useEffect(() => {
    if (params?.id) {
      navigate(`/edit/${params.id}`);
    }
  }, [params?.id, navigate]);

  return <div>Redirecting to editor...</div>;
}
