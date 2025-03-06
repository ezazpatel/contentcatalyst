import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useEffect } from "react";

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const NavLinks = () => (
    <div className="flex flex-col sm:flex-row gap-4">
      <Link href="/">
        <Button 
          variant="outline" 
          className={`w-full sm:w-auto justify-start sm:justify-center ${
            location === "/" ? "bg-accent text-accent-foreground" : ""
          }`}
        >
          Create New Post
        </Button>
      </Link>
      <Link href="/blogs">
        <Button 
          variant="outline" 
          className={`w-full sm:w-auto justify-start sm:justify-center ${
            location === "/blogs" ? "bg-accent text-accent-foreground" : ""
          }`}
        >
          View All Posts
        </Button>
      </Link>
      <Link href="/keywords">
        <Button 
          variant="outline" 
          className={`w-full sm:w-auto justify-start sm:justify-center ${
            location === "/keywords" ? "bg-accent text-accent-foreground" : ""
          }`}
        >
          Manage Keywords
        </Button>
      </Link>
    </div>
  );

  return (
    <nav className="border-b mb-8">
      <div className="container mx-auto py-4 px-4">
        {/* Mobile Menu */}
        <div className="sm:hidden">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[80vw] sm:w-[385px]">
              <div className="py-4">
                <NavLinks />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop Menu */}
        <div className="hidden sm:block">
          <NavLinks />
        </div>
      </div>
    </nav>
  );
}