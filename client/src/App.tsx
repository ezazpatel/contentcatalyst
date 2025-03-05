import { Router, Route } from "wouter";
import Dashboard from "./pages/dashboard";
import KeywordsList from "./pages/keywords-list";
import BlogsList from "./pages/blogs-list";
import ViewPost from "./pages/view-post";
import NewPost from "./pages/new-post";
import { ThemeProvider } from "./components/theme-provider";
import { Toaster } from "./components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <Router>
          <div className="flex h-screen bg-background text-foreground">
            <aside className="w-64 border-r border-border hidden md:block">
              <nav className="p-4 space-y-2">
                <a href="/" className="block p-2 hover:bg-accent rounded-md">Dashboard</a>
                <a href="/keywords" className="block p-2 hover:bg-accent rounded-md">Keywords</a>
                <a href="/blogs" className="block p-2 hover:bg-accent rounded-md">Blogs</a>
              </nav>
            </aside>
            <div className="flex-1 flex flex-col">
              <header className="h-14 border-b border-border flex items-center px-4 md:px-6">
                <h1 className="text-lg font-semibold">Blog Management</h1>
              </header>
              <main className="flex-1 p-4 md:p-6 overflow-auto">
                <Route path="/" component={Dashboard} />
                <Route path="/keywords" component={KeywordsList} />
                <Route path="/blogs" component={BlogsList} />
                <Route path="/view/:id" component={ViewPost} />
                <Route path="/new" component={NewPost} />
              </main>
            </div>
          </div>
        </Router>
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;