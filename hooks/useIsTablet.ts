import { useState, useEffect } from 'react';

export function useIsTablet(): boolean {
  const [isTablet, setIsTablet] = useState(() => detectTablet());

  useEffect(() => {
    const handleResize = () => setIsTablet(detectTablet());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isTablet;
}

function detectTablet(): boolean {
  const width = window.innerWidth;
  const hasTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  return hasTouch && width >= 768 && width <= 1400;
}
