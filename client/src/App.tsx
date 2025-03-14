import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NewPost from "@/pages/new-post";
import BlogsList from "@/pages/blogs-list";
import KeywordsList from "@/pages/keywords-list";
import ViewPost from "@/pages/view-post";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/view/:id" component={ViewPost} />
      <Route path="/blogs" component={BlogsList} />
      <Route path="/keywords" component={KeywordsList} />
      <Route path="/" component={NewPost} />
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