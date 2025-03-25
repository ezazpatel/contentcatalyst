// ProductSlideshow.tsx

import React, { useState, useEffect } from 'react';

interface AffiliateImage {
  url: string;
  alt: string;
  affiliateUrl?: string;
}

interface ProductSlideshowProps {
  images: AffiliateImage[];
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

  // Optional: handle swiping on mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (touchStart === null || touchEnd === null) return;
    if (touchStart - touchEnd > 50) {
      // Swiped left
      nextSlide();
    }
    if (touchStart - touchEnd < -50) {
      // Swiped right
      prevSlide();
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

  useEffect(() => {
    // Automatically move to the next slide every 5 seconds
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, []);

  // Don’t render anything if there are no images
  if (!images || images.length === 0) {
    return null;
  }

  // This is the important part: returning actual JSX for the slideshow
  return (
    <div
      className="slideshow-container"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <h3>{productName}</h3>
      <div className="slide">
        <img
          src={images[currentIndex].url}
          alt={images[currentIndex].alt}
        />
      </div>
      <div className="slideshow-controls">
        <button onClick={prevSlide}>Prev</button>
        <button onClick={nextSlide}>Next</button>
      </div>
    </div>
  );
}
