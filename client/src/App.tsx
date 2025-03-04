import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NewPost from "@/pages/new-post";
import BlogsList from "@/pages/blogs-list";
import KeywordsList from "@/pages/keywords-list";
import Editor from "@/pages/editor";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={NewPost} />
      <Route path="/blogs" component={BlogsList} />
      <Route path="/keywords" component={KeywordsList} />
      <Route path="/edit/:id" component={Editor} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;