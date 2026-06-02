import React from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { cn } from "../../lib/utils";

/**
 * Sistema de revelação ao rolar (scroll reveal).
 * Usa framer-motion `whileInView` — anima uma vez quando entra na viewport.
 */

type Direction = "up" | "down" | "left" | "right" | "none";

const offset = (dir: Direction, dist: number) => {
  switch (dir) {
    case "up": return { y: dist };
    case "down": return { y: -dist };
    case "left": return { x: dist };
    case "right": return { x: -dist };
    default: return {};
  }
};

/** Revela um bloco (card, seção, imagem) deslizando + fade. */
export function Reveal({
  children,
  className,
  direction = "up",
  delay = 0,
  distance = 28,
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  direction?: Direction;
  delay?: number;
  distance?: number;
  once?: boolean;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, ...offset(direction, distance) }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once, margin: "-80px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

/** Container que revela os filhos em cascata (stagger). */
export function RevealGroup({
  children,
  className,
  stagger = 0.08,
  once = true,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  once?: boolean;
}) {
  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: stagger } },
  };
  return (
    <motion.div
      className={className}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once, margin: "-60px" }}
    >
      {children}
    </motion.div>
  );
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
};

/** Filho de <RevealGroup> — anima conforme a cascata do pai. */
export function RevealItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={itemVariants}>
      {children}
    </motion.div>
  );
}

/**
 * Texto revelado palavra a palavra ao rolar.
 * Cada palavra sobe + faz fade em sequência.
 */
export function RevealText({
  text,
  className,
  highlightFrom,
  as: Tag = "h2",
  stagger = 0.06,
}: {
  text: string;
  className?: string;
  /** índice da palavra (0-based) a partir da qual aplica o degradê da marca */
  highlightFrom?: number;
  as?: keyof React.JSX.IntrinsicElements;
  stagger?: number;
}) {
  const words = text.split(" ");
  const MotionTag = motion[Tag as "h2"];
  return (
    <MotionTag
      className={cn("flex flex-wrap", className)}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: stagger } } }}
    >
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.12em]">
          <motion.span
            className={cn(
              "mr-[0.28em] inline-block",
              highlightFrom !== undefined && i >= highlightFrom && "brand-gradient-text",
            )}
            variants={{
              hidden: { y: "110%", opacity: 0 },
              show: { y: "0%", opacity: 1, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
            }}
          >
            {word}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}

export default Reveal;
