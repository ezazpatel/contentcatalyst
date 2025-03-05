
import { Menu, X } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "./button"
import { 
  Sheet,
  SheetContent,
  SheetTrigger,
} from "./sheet"

export function MobileMenu({ items }: { items: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false)
  
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[240px] sm:w-[300px]">
        <div className="flex flex-col gap-4 py-4">
          <Button asChild variant="ghost" className="justify-start" onClick={() => setOpen(false)}>
            <Link to="/">
              <span className="font-bold">Dashboard</span>
            </Link>
          </Button>
          {items.map((item) => (
            <Button 
              key={item.href} 
              asChild 
              variant="ghost" 
              className="justify-start"
              onClick={() => setOpen(false)}
            >
              <Link to={item.href}>{item.label}</Link>
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
