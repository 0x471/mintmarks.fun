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

    // Get CSS variable color
    const getBarColor = (opacity: number) => {
      const isDark = document.documentElement.classList.contains('dark');
      // Use CSS variables for colors
      if (isDark) {
        // Dark mode: Blue-ish vertical bars
        return `rgba(30, 58, 138, ${opacity * 0.15})`;
      } else {
        // Light mode: Subtle gray/blue bars
        return `rgba(240, 244, 249, ${opacity * 0.8})`;
      }
    };

    const draw = () => {
      if (paused) return;

      ctx.clearRect(0, 0, width, height);
      time += speed;

      // Draw gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      const isDark = document.documentElement.classList.contains('dark');
      
      if (isDark) {
        gradient.addColorStop(0, '#0942DF'); // Dark blue start
        gradient.addColorStop(0.5, '#0436E0'); // Dark blue mid
        gradient.addColorStop(1, '#0942DF'); // Dark blue end
      } else {
        gradient.addColorStop(0, '#F0F4F9'); // Light gray/blue start
        gradient.addColorStop(0.5, '#F7F9FC'); // Light gray/blue mid
        gradient.addColorStop(1, '#F0F4F9'); // Light gray/blue end
      }
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Draw vertical bars
      const numBars = Math.ceil(width / (barWidth + gap));

      for (let i = 0; i < numBars; i++) {
        const x = i * (barWidth + gap);
        
        // Calculate bar opacity based on sine wave
        // Different frequency for each bar to create variation
        const opacity = (Math.sin((time * 0.05) + (i * 0.5)) + 1) / 2;
        
        ctx.fillStyle = getBarColor(opacity);
        ctx.fillRect(x, 0, barWidth, height);
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
