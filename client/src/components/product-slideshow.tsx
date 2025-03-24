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
    <div className="relative w-full my-6">
      <Card className="overflow-hidden shadow-lg">
        <div className="flex flex-col">
          <div
            className="relative aspect-[16/9]"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Image container */}
            <div className="absolute inset-0">
              {images.map((image, index) => (
                <div
                  key={index}
                  className={cn(
                    "absolute inset-0 transition-opacity duration-300",
                    index === currentIndex ? "opacity-100" : "opacity-0"
                  )}
                  style={{ zIndex: index === currentIndex ? 1 : 0 }}
                >
                  <img
                    src={image.url}
                    alt={`${productName} - ${image.alt}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>

            {/* Navigation arrows - above images */}
            <div className="absolute inset-0 flex items-center justify-between" style={{ zIndex: 2 }}>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full bg-black/20 hover:bg-black/40 text-white ml-2"
                onClick={prevSlide}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full bg-black/20 hover:bg-black/40 text-white mr-2"
                onClick={nextSlide}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </div>

            {/* Image counter - above images */}
            <div className="absolute bottom-4 right-4 bg-black/60 text-white px-2 py-1 rounded text-sm" style={{ zIndex: 2 }}>
              {currentIndex + 1} / {images.length}
            </div>
          </div>

          {/* Caption - separate from image container */}
          <div className="mt-0 p-4 text-sm text-muted-foreground bg-white border-t">
            {images[currentIndex].alt}
          </div>
        </div>
      </Card>
    </div>
  );
}