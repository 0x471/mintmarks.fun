import React, { useEffect, useRef } from 'react';

interface VerticalBarsNoiseProps {
  paused?: boolean;
  className?: string;
}

export const VerticalBarsNoise: React.FC<VerticalBarsNoiseProps> = ({
  paused = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    // Configuration
    const barWidth = 100; // Width of each vertical bar
    const gap = 0; // No gap between bars
    const speed = 0.2; // Speed of vertical movement
    const noiseIntensity = 0.03; // Subtle noise

    // State
    let time = 0;

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', resize);

    // Helper to get CSS variable value
    const getCssVar = (name: string) => {
      return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    };

    const draw = () => {
      if (paused) return;

      ctx.clearRect(0, 0, width, height);
      time += speed;

      // Draw gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, height);

      // Use CSS variables for gradient colors
      gradient.addColorStop(0, getCssVar('--bg-animation-gradient-start'));
      gradient.addColorStop(0.5, getCssVar('--bg-animation-gradient-mid'));
      gradient.addColorStop(1, getCssVar('--bg-animation-gradient-end'));

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw vertical bars
      const numBars = Math.ceil(width / (barWidth + gap));

      // Get base bar color from CSS variable (using the 'mid' one as base)
      // Note: We need to handle opacity manually since canvas doesn't support CSS variable alpha modification easily
      // So we'll rely on the variable being an rgba or hex string and apply globalAlpha or just use the variable as is if it has alpha
      // But the original code modified opacity.
      // Let's try to parse the color or just use globalAlpha.

      const barColorBase = getCssVar('--bg-animation-bar-color-mid');

      for (let i = 0; i < numBars; i++) {
        const x = i * (barWidth + gap);

        // Calculate bar opacity based on sine wave
        const opacity = (Math.sin((time * 0.05) + (i * 0.5)) + 1) / 2;

        ctx.save();
        ctx.globalAlpha = opacity; // Apply opacity to the drawing context
        ctx.fillStyle = barColorBase;
        ctx.fillRect(x, 0, barWidth, height);
        ctx.restore();
      }

      // Add noise overlay
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * noiseIntensity * 255;
        data[i] = Math.max(0, Math.min(255, data[i] + noise));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
      }

      ctx.putImageData(imageData, 0, 0);

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [paused]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 -z-10 w-full h-full pointer-events-none ${className}`}
      style={{ opacity: 1 }} // Ensure visibility
    />
  );
};

export default VerticalBarsNoise;
