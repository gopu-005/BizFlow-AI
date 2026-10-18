'use client';

import React, { useEffect, useRef } from 'react';

interface AiVoiceOrbProps {
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  onClick?: () => void;
}

export const AiVoiceOrb: React.FC<AiVoiceOrbProps> = ({
  isListening,
  isSpeaking,
  isProcessing,
  onClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Mouse interaction for subtle tilt
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    // Mouse movement listener
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const normX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const normY = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      mouseRef.current.targetX = Math.max(-1, Math.min(1, normX));
      mouseRef.current.targetY = Math.max(-1, Math.min(1, normY));
    };

    const handleMouseLeave = () => {
      mouseRef.current.targetX = 0;
      mouseRef.current.targetY = 0;
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    // Swirling 3D Neon Fluid Ribbon configuration
    const fluidRibbons = [
      {
        // 1. Top-Left Violet / Lavender
        baseRadius: 48,
        tiltX: 0.45,
        tiltY: -0.3,
        rotSpeed: 0.75,
        waveAmp: 11,
        waveFreq: 2,
        colorCore: 'rgba(216, 180, 254, 0.95)',
        colorGlow: 'rgba(168, 85, 247, 0.45)',
        colorDiffuse: 'rgba(147, 51, 234, 0.18)',
        phaseOffset: 0,
      },
      {
        // 2. Right Cyan / Electric Azure
        baseRadius: 52,
        tiltX: -0.5,
        tiltY: 0.55,
        rotSpeed: 0.9,
        waveAmp: 13,
        waveFreq: 3,
        colorCore: 'rgba(125, 211, 252, 0.95)',
        colorGlow: 'rgba(56, 189, 248, 0.5)',
        colorDiffuse: 'rgba(37, 99, 235, 0.22)',
        phaseOffset: 2.1,
      },
      {
        // 3. Lower Fuchsia / Magenta
        baseRadius: 50,
        tiltX: 0.6,
        tiltY: 0.4,
        rotSpeed: 0.82,
        waveAmp: 12,
        waveFreq: 2,
        colorCore: 'rgba(244, 114, 182, 0.95)',
        colorGlow: 'rgba(236, 72, 153, 0.55)',
        colorDiffuse: 'rgba(219, 39, 119, 0.2)',
        phaseOffset: 4.2,
      },
      {
        // 4. Central Cross-Loop Royal Blue / Indigo
        baseRadius: 46,
        tiltX: -0.35,
        tiltY: -0.65,
        rotSpeed: 0.68,
        waveAmp: 10,
        waveFreq: 2,
        colorCore: 'rgba(147, 197, 253, 0.9)',
        colorGlow: 'rgba(99, 102, 241, 0.45)',
        colorDiffuse: 'rgba(79, 70, 229, 0.18)',
        phaseOffset: 1.4,
      },
      {
        // 5. Outer Ambient Swirl Light Violet
        baseRadius: 56,
        tiltX: 0.2,
        tiltY: 0.7,
        rotSpeed: 1.05,
        waveAmp: 14,
        waveFreq: 3,
        colorCore: 'rgba(255, 255, 255, 0.85)',
        colorGlow: 'rgba(192, 132, 252, 0.5)',
        colorDiffuse: 'rgba(126, 34, 206, 0.15)',
        phaseOffset: 3.5,
      },
      {
        // 6. Deep Blue / Violet Counter-Wave
        baseRadius: 44,
        tiltX: -0.7,
        tiltY: 0.2,
        rotSpeed: -0.72,
        waveAmp: 9,
        waveFreq: 2,
        colorCore: 'rgba(165, 180, 252, 0.85)',
        colorGlow: 'rgba(59, 130, 246, 0.4)',
        colorDiffuse: 'rgba(30, 58, 138, 0.25)',
        phaseOffset: 5.0,
      },
    ];

    const render = () => {
      time += 0.024;

      // Mouse lerp
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      const sphereRadius = 74;

      ctx.clearRect(0, 0, width, height);

      // Activity multiplier
      const energy = isListening ? 1.6 : isSpeaking ? 1.35 : isProcessing ? 1.8 : 1.0;
      const speedMultiplier = isListening ? 1.8 : isSpeaking ? 1.4 : isProcessing ? 2.2 : 1.0;

      // 1. OUTER TRANSLUCENT AURA & AMBIENT GLOW
      const outerGlow = ctx.createRadialGradient(
        centerX,
        centerY,
        sphereRadius * 0.7,
        centerX,
        centerY,
        sphereRadius * 1.55
      );
      outerGlow.addColorStop(0, 'rgba(192, 132, 252, 0.35)');
      outerGlow.addColorStop(0.35, 'rgba(147, 51, 234, 0.18)');
      outerGlow.addColorStop(0.7, 'rgba(99, 102, 241, 0.07)');
      outerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, sphereRadius * 1.55, 0, Math.PI * 2);
      ctx.fill();

      // Active state pulse wave
      if (isListening || isSpeaking) {
        const pulse = (time * 1.6) % 1;
        const pulseR = sphereRadius + pulse * 28;
        const pulseAlpha = Math.max(0, (1 - pulse) * 0.4);
        ctx.strokeStyle = isListening
          ? `rgba(244, 114, 182, ${pulseAlpha})`
          : `rgba(168, 85, 247, ${pulseAlpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseR, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 2. CLIP TO REALISTIC SPHERICAL BALL
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, sphereRadius, 0, Math.PI * 2);
      ctx.clip();

      // 3. BASE SPHERE BACKGROUND (Deep Midnight Cosmic Void)
      const baseGrad = ctx.createRadialGradient(
        centerX - sphereRadius * 0.15,
        centerY - sphereRadius * 0.15,
        5,
        centerX,
        centerY,
        sphereRadius
      );
      baseGrad.addColorStop(0, '#04010a');
      baseGrad.addColorStop(0.55, '#070214');
      baseGrad.addColorStop(0.82, '#140628');
      baseGrad.addColorStop(0.96, '#311054');
      baseGrad.addColorStop(1, '#6b21a8');

      ctx.fillStyle = baseGrad;
      ctx.fillRect(centerX - sphereRadius, centerY - sphereRadius, sphereRadius * 2, sphereRadius * 2);

      // 4. SWIRLING NEON FLUID RIBBONS (Screen / Lighter blend mode)
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      fluidRibbons.forEach((ribbon, idx) => {
        const ribbonTime = time * ribbon.rotSpeed * speedMultiplier + ribbon.phaseOffset;
        const currentAmp = ribbon.waveAmp * energy;

        const tiltX = ribbon.tiltX + mouseRef.current.y * 0.1;
        const tiltY = ribbon.tiltY + mouseRef.current.x * 0.1;
        const cosX = Math.cos(tiltX);
        const sinX = Math.sin(tiltX);
        const cosY = Math.cos(tiltY);
        const sinY = Math.sin(tiltY);

        // Compute 3D points around the orbital fluid loop
        const points: { x: number; y: number; z: number }[] = [];
        const numSegments = 54;

        for (let s = 0; s <= numSegments; s++) {
          const theta = (s / numSegments) * Math.PI * 2;

          // Harmonic undulating wave on the fluid loop
          const wave1 = Math.sin(theta * ribbon.waveFreq + ribbonTime) * currentAmp;
          const wave2 = Math.cos(theta * (ribbon.waveFreq + 1) - ribbonTime * 0.8) * (currentAmp * 0.4);
          const r = ribbon.baseRadius + wave1 + wave2;

          // 3D coordinates
          const x0 = Math.cos(theta) * r;
          const y0 = Math.sin(theta) * r;
          const z0 = Math.sin(theta * 2 + ribbonTime) * (currentAmp * 0.7);

          // Apply rotation
          const x1 = x0 * cosY - z0 * sinY;
          const z1 = x0 * sinY + z0 * cosY;
          const y1 = y0 * cosX - z1 * sinX;
          const z2 = y0 * sinX + z1 * cosX;

          points.push({
            x: centerX + x1,
            y: centerY + y1,
            z: z2,
          });
        }

        // --- Pass A: Soft Diffuse Fluid Glow ---
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
        ctx.strokeStyle = ribbon.colorDiffuse;
        ctx.lineWidth = 14;
        ctx.stroke();

        // --- Pass B: Medium Body Luminescence ---
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
        ctx.strokeStyle = ribbon.colorGlow;
        ctx.lineWidth = 6;
        ctx.stroke();

        // --- Pass C: Bright Neon Fluid Filament Core ---
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.closePath();
        ctx.strokeStyle = ribbon.colorCore;
        ctx.lineWidth = 2.2;
        ctx.stroke();
      });

      ctx.restore();

      // 5. DEEP DARK CENTRAL VOID / PUPIL (Crucial for the exact reference look)
      const coreVoid = ctx.createRadialGradient(
        centerX,
        centerY,
        6,
        centerX,
        centerY,
        sphereRadius * 0.52
      );
      coreVoid.addColorStop(0, '#040109');
      coreVoid.addColorStop(0.65, '#070212');
      coreVoid.addColorStop(0.88, 'rgba(14, 5, 27, 0.85)');
      coreVoid.addColorStop(1, 'rgba(14, 5, 27, 0)');

      ctx.fillStyle = coreVoid;
      ctx.beginPath();
      ctx.arc(centerX, centerY, sphereRadius * 0.55, 0, Math.PI * 2);
      ctx.fill();

      // 6. GLASS FRESNEL RIM & TRANSLUCENT FROSTED EDGE
      const innerRimGlow = ctx.createRadialGradient(
        centerX,
        centerY,
        sphereRadius * 0.72,
        centerX,
        centerY,
        sphereRadius
      );
      innerRimGlow.addColorStop(0, 'rgba(255, 255, 255, 0)');
      innerRimGlow.addColorStop(0.7, 'rgba(192, 132, 252, 0.25)');
      innerRimGlow.addColorStop(0.92, 'rgba(233, 213, 255, 0.65)');
      innerRimGlow.addColorStop(1, 'rgba(255, 255, 255, 0.85)');

      ctx.fillStyle = innerRimGlow;
      ctx.beginPath();
      ctx.arc(centerX, centerY, sphereRadius, 0, Math.PI * 2);
      ctx.fill();

      // 7. SPECULAR CAUSTIC LENS FLARE (Upper-Right at ~1:30 position matching reference)
      const flareX = centerX + sphereRadius * 0.52;
      const flareY = centerY - sphereRadius * 0.50;

      const specularFlare = ctx.createRadialGradient(
        flareX,
        flareY,
        1,
        flareX,
        flareY,
        22
      );
      specularFlare.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
      specularFlare.addColorStop(0.25, 'rgba(216, 235, 255, 0.85)');
      specularFlare.addColorStop(0.55, 'rgba(147, 197, 253, 0.35)');
      specularFlare.addColorStop(1, 'rgba(99, 102, 241, 0)');

      ctx.fillStyle = specularFlare;
      ctx.beginPath();
      ctx.arc(flareX, flareY, 22, 0, Math.PI * 2);
      ctx.fill();

      // Sparkle cross ray on specular highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(flareX - 10, flareY);
      ctx.lineTo(flareX + 10, flareY);
      ctx.moveTo(flareX, flareY - 10);
      ctx.lineTo(flareX, flareY + 10);
      ctx.stroke();

      // Soft upper glass curvature arc highlight
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(centerX, centerY + 1, sphereRadius - 2.5, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();

      // End sphere clip
      ctx.restore();

      // 8. OUTER CHROMATIC GLASS RIM OUTLINE
      ctx.strokeStyle = 'rgba(224, 204, 255, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, sphereRadius, 0, Math.PI * 2);
      ctx.stroke();

      // 9. DYNAMIC AUDIO EQUALIZER LINES (Left & Right flanking lines moving with speech & reply)
      const numBars = 16;
      const barWidth = 3.2;
      const barSpacing = 6.8;

      for (let i = 0; i < numBars; i++) {
        const norm = i / (numBars - 1);
        const distFromCenter = 1 - norm; // 0 closest to sphere, 1 furthest
        const envelope = Math.sin(norm * Math.PI) * 0.7 + 0.3;

        let activeHeight = 4;

        if (isListening) {
          // USER SPEAKING: Dynamic lively speech waveforms with natural jitter
          const h1 = Math.sin(time * 9.5 + i * 0.7) * 0.42;
          const h2 = Math.cos(time * 16.0 - i * 1.3) * 0.36;
          const h3 = Math.sin(time * 23.0 + i * 2.1) * 0.22;
          const jitter = Math.sin(time * 35.0 + i * 4.3) * 0.2;
          const waveVal = Math.abs(h1 + h2 + h3 + jitter);
          activeHeight = 5 + waveVal * 42 * envelope;
        } else if (isSpeaking) {
          // AGENT REPLYING: Smooth harmonic vocal cadence rippling outward
          const wavePhase = time * 8.2 - distFromCenter * 3.8;
          const cadence = Math.sin(time * 3.0) * 0.25 + 0.75;
          const h1 = Math.sin(wavePhase) * 0.5 + 0.5;
          const h2 = Math.cos(time * 11.5 - i * 0.9) * 0.3 + 0.3;
          const waveVal = (h1 * 0.65 + h2 * 0.35) * cadence;
          activeHeight = 5 + waveVal * 36 * envelope;
        } else if (isProcessing) {
          // AI THINKING
          const waveVal = Math.sin(time * 14.0 + i * 0.9) * 0.5 + 0.5;
          activeHeight = 5 + waveVal * 24 * envelope;
        } else {
          // IDLE: Soft organic breathing motion — alive, NOT stationary!
          const idleWave = Math.sin(time * 2.4 + i * 0.45) * 0.5 + 0.5;
          activeHeight = 4 + idleWave * 8 * envelope;
        }

        const barH = Math.max(4, activeHeight);

        // --- DRAW LEFT BAR ---
        const leftX = centerX - sphereRadius - 18 - (numBars - 1 - i) * barSpacing;
        const leftY = centerY - barH / 2;

        const leftGrad = ctx.createLinearGradient(0, leftY, 0, leftY + barH);
        if (isListening) {
          leftGrad.addColorStop(0, '#f472b6');
          leftGrad.addColorStop(0.5, '#c084fc');
          leftGrad.addColorStop(1, '#818cf8');
        } else if (isSpeaking) {
          leftGrad.addColorStop(0, '#c084fc');
          leftGrad.addColorStop(0.5, '#38bdf8');
          leftGrad.addColorStop(1, '#9333ea');
        } else {
          leftGrad.addColorStop(0, 'rgba(192, 132, 252, 0.75)');
          leftGrad.addColorStop(1, 'rgba(147, 51, 234, 0.25)');
        }

        ctx.fillStyle = leftGrad;
        ctx.beginPath();
        ctx.roundRect(leftX, leftY, barWidth, barH, 2);
        ctx.fill();

        // --- DRAW RIGHT BAR ---
        const rightX = centerX + sphereRadius + 18 + i * barSpacing;
        const rightY = centerY - barH / 2;

        const rightGrad = ctx.createLinearGradient(0, rightY, 0, rightY + barH);
        if (isListening) {
          rightGrad.addColorStop(0, '#f472b6');
          rightGrad.addColorStop(0.5, '#c084fc');
          rightGrad.addColorStop(1, '#818cf8');
        } else if (isSpeaking) {
          rightGrad.addColorStop(0, '#c084fc');
          rightGrad.addColorStop(0.5, '#38bdf8');
          rightGrad.addColorStop(1, '#9333ea');
        } else {
          rightGrad.addColorStop(0, 'rgba(192, 132, 252, 0.75)');
          rightGrad.addColorStop(1, 'rgba(147, 51, 234, 0.25)');
        }

        ctx.fillStyle = rightGrad;
        ctx.beginPath();
        ctx.roundRect(rightX, rightY, barWidth, barH, 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, [isListening, isSpeaking, isProcessing]);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center justify-center select-none py-1 w-full max-w-xl mx-auto"
    >
      {/* Central Realistic Spherical Glass Ball with Neon Fluid */}
      <div
        onClick={onClick}
        className="relative cursor-pointer group flex items-center justify-center transition-transform hover:scale-[1.03] active:scale-[0.97]"
        title="BizFlow AI Realistic Neon Fluid Sphere — Click to speak or listen"
      >
        <canvas
          ref={canvasRef}
          width={520}
          height={220}
          className="w-full max-w-[480px] sm:max-w-[520px] h-auto drop-shadow-[0_0_45px_rgba(168,85,247,0.38)]"
        />

        {/* Outer subtle glow indicator when listening */}
        {isListening && (
          <div className="absolute inset-0 rounded-full border border-fuchsia-400/40 animate-ping opacity-40 pointer-events-none" />
        )}
      </div>
    </div>
  );
};
