import { useEffect, useRef } from 'react';

interface UseBarcodeOptions {
  onScan: (barcode: string) => void;
  enabled?: boolean;
}

export const useBarcode = ({ onScan, enabled = true }: UseBarcodeOptions) => {
  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore modifier keys
      if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
        return;
      }

      const currentTime = Date.now();
      
      // Hardware barcode scanners type characters in extremely rapid succession (usually < 30ms apart)
      // If the delay is more than 100ms, reset the buffer as it is likely manual user typing
      if (currentTime - lastKeyTimeRef.current > 100) {
        bufferRef.current = '';
      }

      lastKeyTimeRef.current = currentTime;

      if (e.key === 'Enter') {
        if (bufferRef.current.length >= 3) { // barcodes are usually at least 3 digits/characters
          onScan(bufferRef.current);
          bufferRef.current = '';
          e.preventDefault();
        }
      } else {
        bufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onScan, enabled]);
};
