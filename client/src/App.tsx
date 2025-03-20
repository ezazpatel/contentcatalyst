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
      <nav className="bg-gray-800 p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-white text-2xl font-bold">Dashboard</h1>
            <p className="text-white text-sm">Canada Things to Do</p>
          </div>
          <div className="flex space-x-4">
            {/* Add your navigation buttons here */}
          </div>
        </div>
      </nav>
      <div className="container mx-auto">
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
      </div>
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