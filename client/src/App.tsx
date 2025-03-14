import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NewPost from "@/pages/new-post";
import BlogsList from "@/pages/blogs-list";
import KeywordsList from "@/pages/keywords-list";
import ViewPost from "@/pages/view-post";
import NotFound from "@/pages/not-found";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";

function Router() {
  const [location] = useLocation();

  return (
    <>
      <Breadcrumb className="mb-4 px-4 py-2">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          {location.startsWith("/blogs") && (
            <BreadcrumbItem>
              <BreadcrumbLink href="/blogs">Blogs</BreadcrumbLink>
            </BreadcrumbItem>
          )}
          {location.startsWith("/view/") && (
            <>
              <BreadcrumbItem>
                <BreadcrumbLink href="/blogs">Blogs</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbPage>View Post</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      <Switch>
        <Route path="/blogs" component={BlogsList} />
        <Route path="/view/:id" component={ViewPost} />
        <Route path="/keywords" component={KeywordsList} />
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