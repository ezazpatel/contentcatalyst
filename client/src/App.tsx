import { Switch, Route, useLocation, Link } from "wouter";
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
      <Switch>
        <Route path="/blogs" component={BlogsList} />
        <Route path="/view/:id" component={ViewPost} />
        <Route path="/keywords" component={KeywordsList} />
        <Route path="/" component={NewPost} />
        <Route component={NotFound} />
      </Switch>
      <Breadcrumb className="mb-4 px-4 py-2">
        <BreadcrumbList>
          <BreadcrumbItem>
            <Link href="/">
              <BreadcrumbLink as="span">Home</BreadcrumbLink>
            </Link>
          </BreadcrumbItem>

          {location === "/blogs" && (
            <BreadcrumbItem>
              <BreadcrumbPage>Blogs</BreadcrumbPage>
            </BreadcrumbItem>
          )}

          {location.startsWith("/view/") && (
            <>
              <BreadcrumbItem>
                <Link href="/blogs">
                  <BreadcrumbLink as="span">Blogs</BreadcrumbLink>
                </Link>
              </BreadcrumbItem>
              <BreadcrumbItem>
                <BreadcrumbPage>View Post</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}

          {location === "/" && (
            <BreadcrumbItem>
              <BreadcrumbPage>New Post</BreadcrumbPage>
            </BreadcrumbItem>
          )}

          {location === "/keywords" && (
            <BreadcrumbItem>
              <BreadcrumbPage>Keywords</BreadcrumbPage>
            </BreadcrumbItem>
          )}
        </BreadcrumbList>
      </Breadcrumb>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Added Navbar placeholder -  replace with your actual Navbar component */}
      <nav className="navbar">
        <div className="navbar-brand">My Website</div>
      </nav>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;