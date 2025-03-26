import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AffiliateImage } from "@shared/schema";

interface ProductSlideshowProps {
  images: AffiliateImage[];
  productCode: string;
}

export default function ProductSlideshow({ images, productCode }: ProductSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images?.length) return null;

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto my-4">
      <img
        src={images[currentIndex].url}
        alt={images[currentIndex].alt}
        className="w-full h-64 object-cover rounded-lg"
      />
      <p className="text-center text-sm text-gray-500 mt-2">Product code: {productCode}</p>
      {images.length > 1 && (
        <div className="absolute inset-0 flex items-center justify-between p-4">
          <Button
            variant="outline"
            size="icon"
            onClick={prevSlide}
            className="h-8 w-8 rounded-full bg-white/70"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={nextSlide}
            className="h-8 w-8 rounded-full bg-white/70"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}