
import { useState, useEffect } from "react";

interface ProductImage {
  url: string;
  alt: string;
  affiliateUrl?: string;
}

interface ProductSlideshowProps {
  images: ProductImage[];
  productName: string;
}

export function ProductSlideshow({ images, productName }: ProductSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

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

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) nextSlide();
    if (distance < -50) prevSlide();
    setTouchStart(null);
    setTouchEnd(null);
  };

  useEffect(() => {
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, []);

  if (!images || images.length === 0) return null;

  return (
    <div 
      className="relative w-full h-96 overflow-hidden rounded-lg shadow-lg my-4"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {images.map((image, index) => (
        <div
          key={index}
          className={`absolute w-full h-full transition-transform duration-500 ease-in-out`}
          style={{ transform: `translateX(${100 * (index - currentIndex)}%)` }}
        >
          {image.affiliateUrl ? (
            <a href={image.affiliateUrl} target="_blank" rel="noopener noreferrer">
              <img
                src={image.url}
                alt={image.alt || `${productName} Image ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </a>
          ) : (
            <img
              src={image.url}
              alt={image.alt || `${productName} Image ${index + 1}`}
              className="w-full h-full object-cover"
            />
          )}
        </div>
      ))}
      
      <button
        onClick={prevSlide}
        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full"
      >
        ←
      </button>
      <button
        onClick={nextSlide}
        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 text-white p-2 rounded-full"
      >
        →
      </button>
      
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        {images.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full ${
              index === currentIndex ? 'bg-white' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
