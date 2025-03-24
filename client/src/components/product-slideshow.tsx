import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ProductImage {
  url: string;
  alt: string;
}

interface ProductSlideshowProps {
  images: ProductImage[];
  productName: string;
}

export function ProductSlideshow({ images, productName }: ProductSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  const prevSlide = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };

  // Handle touch events for mobile swipe
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }

    setTouchStart(null);
    setTouchEnd(null);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto my-6">
      <Card className="overflow-hidden">
        <div 
          className="relative aspect-video"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {images.map((image, index) => (
            <div
              key={index}
              className={cn(
                "absolute inset-0 transition-opacity duration-300",
                index === currentIndex ? "opacity-100" : "opacity-0"
              )}
            >
              <img
                src={image.url}
                alt={`${productName} - ${image.alt}`}
                className="w-full h-full object-cover"
              />
            </div>
          ))}
          
          {/* Navigation arrows - only show on desktop */}
          <div className="absolute inset-0 flex items-center justify-between p-4 md:block hidden">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-white/80 hover:bg-white"
              onClick={prevSlide}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full bg-white/80 hover:bg-white"
              onClick={nextSlide}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Image counter */}
          <div className="absolute bottom-4 right-4 bg-black/60 text-white px-2 py-1 rounded text-sm">
            {currentIndex + 1} / {images.length}
          </div>
        </div>
        
        {/* Caption */}
        <div className="p-4 text-sm text-muted-foreground">
          {images[currentIndex].alt}
        </div>
      </Card>
    </div>
  );
}
