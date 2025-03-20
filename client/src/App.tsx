import { Switch, Route, useLocation, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NewPost from "@/pages/new-post";
import BlogsList from "@/pages/blogs-list";
import KeywordsList from "@/pages/keywords-list";
import ViewPost from "@/pages/view-post";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Navbar } from "@/components/navbar";

function Router() {
  const [location] = useLocation();

  return (
    <>
      <Navbar />
      <Switch>
        <Route path="/blogs" component={BlogsList} />
        <Route path="/view/:id" component={ViewPost} />
        <Route path="/keywords" component={KeywordsList} />
        <Route path="/bulk-upload" component={Dashboard} />
        <Route path="/" component={NewPost} />
        <Route component={NotFound} />
      </Switch>
    </>
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