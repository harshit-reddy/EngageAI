import { useState, useEffect } from 'react';

const MOBILE_THRESHOLD = 768;

export default function useIsMobile(threshold = MOBILE_THRESHOLD) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < threshold : false
  );

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < threshold);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [threshold]);

  return isMobile;
}
