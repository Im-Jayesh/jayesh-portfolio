"use client";

import { useRef, useState, useEffect } from "react";
import {
  motion,
  useSpring,
  useVelocity,
  useTransform,
  AnimatePresence,
  useMotionValue,
} from "framer-motion";
import { X } from "lucide-react";
import styles from "./carousel.module.css";

// Helper to wrap values for infinite looping
const wrap = (min: number, max: number, v: number) => {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

interface Photo {
  id: number;
  url: string;
  publicId: string;
  title: string | null;
  displayOrder: number;
}

interface VelocityCarouselProps {
  photos: Photo[];
}

function Plane({
  index,
  totalPlanes,
  scrollValue,
  smoothVelocity,
  photo,
  onClick,
}: {
  index: number;
  totalPlanes: number;
  scrollValue: any;
  smoothVelocity: any;
  photo: Photo;
  onClick: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  // Initial offset for this plane in the sequence
  const offset = index / totalPlanes;

  // Wrap the global scroll progress so it loops seamlessly.
  const progress = useTransform(scrollValue, (v: number) =>
    wrap(0, 1, offset - v)
  );

  // ┌─────────────────────────────────────────────────────────────┐
  // │ USER: THIS IS WHERE YOU CHANGE THE ANGLES AND POSITIONS!    │
  // │ The arrays represent [front-closest-value, back-farthest-value]
  // └─────────────────────────────────────────────────────────────┘

  // 1. POSITION
  const x = useTransform(progress, [0, 1], ["-40vw", "60vw"]); 
  const yBase = useTransform(progress, [0, 1], [30, -50]); 

  // 2. 3D ANGLES
  const rotateX = useTransform(progress, [0, 1], [-12, -12]);   // Negative = Top edge aggressively pushed towards you
  const rotateY = useTransform(progress, [0, 1], [-20, -20]); // Right edge drastically pointing towards you
  const rotateZ = useTransform(progress, [0, 1], [2, 2]);   // 2 degrees clockwise in the X-Y plane
  
  // 3. DEPTH AND SCALE
  const scale = useTransform(progress, [0, 1], [0.9, 0.72]);  // Cards get exactly 20% smaller as they move to the back

  // ───────────────────────────────────────────────────────────────

  // Add curve path based on velocity
  const yFinal = useTransform([yBase, progress, smoothVelocity], ([yB, p, v]: [number, number, number]) => {
    // When velocity (v) is high, it bends the Y trajectory in a wave curve!
    const curve = Math.sin(p * Math.PI) * (v * 15); 
    return `${yB + curve}vh`;
  });

  // Calculate Z with NO depth cascade (flat 2D), but keep the velocity wave ripple!
  const z = useTransform([progress, smoothVelocity], ([p, v]: [number, number]) => {
    const baseZ = 0; // ZERO depth cascade
    // Depth wave ripple linked to scroll velocity
    const wave = Math.sin(p * Math.PI * 4) * (v * 40); 
    return baseZ + wave;
  });

  // Fade in at the front, fade out at the back for seamless looping
  const opacity = useTransform(
    progress,
    [0, 0.05, 0.85, 1],
    [0, 1, 1, 0]
  );

  return (
    <motion.div
      className={styles.plane}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      style={{
        x,
        y: yFinal,
        z,
        rotateX: isHovered ? 0 : rotateX,
        rotateY: isHovered ? 0 : rotateY,
        rotateZ: isHovered ? 0 : rotateZ,
        scale: isHovered ? 1.2 : scale,
        opacity,
      }}
      transition={{
        rotateX: { type: "spring", stiffness: 300, damping: 30 },
        rotateY: { type: "spring", stiffness: 300, damping: 30 },
        scale: { type: "spring", stiffness: 300, damping: 30 },
      }}
    >
      <div className={styles.planeImageContainer}>
        <img
          src={photo.url}
          alt={`Plane ${index}`}
          className={styles.planeImage}
          draggable={false}
        />
      </div>
      <div className={styles.planeIndex}>{String(index).padStart(2, "0")}</div>
    </motion.div>
  );
}

export default function VelocityCarousel({ photos }: VelocityCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activePhoto, setActivePhoto] = useState<{
    photo: Photo;
    index: number;
  } | null>(null);

  const totalPlanes = 7; // Reduced planes = 40% more spacing between cards

  // Track an internal scroll value manually rather than the page's scroll
  const scrollValue = useMotionValue(0);
  // Pass the raw scroll steps through a physics spring to make it buttery smooth!
  const smoothScrollValue = useSpring(scrollValue, {
    damping: 50,
    stiffness: 200,
    mass: 0.8,
  });

  const scrollVelocity = useVelocity(smoothScrollValue);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 60,
    stiffness: 400,
  });

  // Manually handle wheel events to scroll the carousel without scrolling the page
  const handleWheel = (e: React.WheelEvent) => {
    scrollValue.set(scrollValue.get() + e.deltaY * 0.0005);
  };

  // Enable dragging/panning
  const handlePan = (e: any, info: any) => {
    const delta = (info.delta.x - info.delta.y) * -0.0005;
    scrollValue.set(scrollValue.get() + delta);
  };

  if (!photos || photos.length === 0) return null;

  return (
    <section 
      ref={containerRef} 
      className={styles.carouselSection}
      onWheel={handleWheel}
    >
      <motion.div 
        className={styles.stickyViewport}
        onPan={handlePan}
        style={{ touchAction: "none" }}
      >
        <div className={styles.planesContainer}>
          {Array.from({ length: totalPlanes }, (_, i) => {
            const photo = photos[i % photos.length];
            return (
              <Plane
                key={i}
                index={i}
                totalPlanes={totalPlanes}
                scrollValue={smoothScrollValue}
                smoothVelocity={smoothVelocity}
                photo={photo}
                onClick={() => setActivePhoto({ photo, index: i })}
              />
            );
          })}
        </div>
      </motion.div>

      {/* Lightbox Modal overlay */}
      <AnimatePresence>
        {activePhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={styles.lightboxOverlay}
            onClick={() => setActivePhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.88, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.88, y: 30 }}
              transition={{ type: "spring", damping: 24, stiffness: 200 }}
              className={styles.lightboxContent}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className={styles.closeButton}
                onClick={() => setActivePhoto(null)}
              >
                <X size={14} />
                <span>ESC</span>
              </button>
              <img
                src={activePhoto.photo.url}
                alt={activePhoto.photo.title || "Lightbox"}
                className={styles.lightboxImage}
              />
              <p className={styles.lightboxTitle}>
                {activePhoto.photo.title || "Portfolio Item"}
              </p>
              <span className={styles.lightboxCounter}>
                {activePhoto.index + 1} / {photos.length}
              </span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
