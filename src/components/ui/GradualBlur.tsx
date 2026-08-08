import React, { useEffect, useMemo, useRef, useState } from "react";

import "./GradualBlur.css";

export type GradualBlurPosition = "top" | "bottom" | "left" | "right";
export type GradualBlurCurve = "linear" | "bezier" | "ease-in" | "ease-out" | "ease-in-out";
export type GradualBlurTarget = "parent" | "page";

export interface GradualBlurProps {
  position?: GradualBlurPosition;
  strength?: number;
  height?: string;
  width?: string;
  divCount?: number;
  exponential?: boolean;
  curve?: GradualBlurCurve;
  opacity?: number;
  animated?: boolean | "scroll";
  duration?: string;
  easing?: string;
  hoverIntensity?: number;
  target?: GradualBlurTarget;
  preset?: string;
  responsive?: boolean;
  zIndex?: number;
  onAnimationComplete?: () => void;
  className?: string;
  style?: React.CSSProperties;
  mobileHeight?: string;
  tabletHeight?: string;
  desktopHeight?: string;
  mobileWidth?: string;
  tabletWidth?: string;
  desktopWidth?: string;
}

const DEFAULT_CONFIG = {
  position: "bottom",
  strength: 2,
  height: "6rem",
  divCount: 5,
  exponential: false,
  zIndex: 1000,
  animated: false,
  duration: "0.3s",
  easing: "ease-out",
  opacity: 1,
  curve: "linear",
  responsive: false,
  target: "parent",
  className: "",
  style: {},
} as Record<string, unknown>;

const PRESETS: Record<string, Record<string, unknown>> = {
  top: { position: "top", height: "6rem" },
  bottom: { position: "bottom", height: "6rem" },
  left: { position: "left", height: "6rem" },
  right: { position: "right", height: "6rem" },
  subtle: { height: "4rem", strength: 1, opacity: 0.8, divCount: 3 },
  intense: { height: "10rem", strength: 4, divCount: 8, exponential: true },
  smooth: { height: "8rem", curve: "bezier", divCount: 10 },
  sharp: { height: "5rem", curve: "linear", divCount: 4 },
  header: { position: "top", height: "8rem", curve: "ease-out" },
  footer: { position: "bottom", height: "8rem", curve: "ease-out" },
  sidebar: { position: "left", height: "6rem", strength: 2.5 },
  "page-header": { position: "top", height: "10rem", target: "page", strength: 3 },
  "page-footer": { position: "bottom", height: "10rem", target: "page", strength: 3 },
} as const;

const CURVE_FUNCTIONS: Record<string, (p: number) => number> = {
  linear: (p) => p,
  bezier: (p) => p * p * (3 - 2 * p),
  "ease-in": (p) => p * p,
  "ease-out": (p) => 1 - Math.pow(1 - p, 2),
  "ease-in-out": (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
};

const mergeConfigs = (...configs: Array<Record<string, unknown>>) =>
  configs.reduce((acc, c) => ({ ...acc, ...c }), {} as Record<string, unknown>);

const getGradientDirection = (position: string) =>
  ({ top: "to top", bottom: "to bottom", left: "to left", right: "to right" })[position] ||
  "to bottom";

const debounce = (fn: () => void, wait: number) => {
  let t: number | undefined;
  return (..._args: unknown[]) => {
    clearTimeout(t);
    t = window.setTimeout(() => fn(), wait);
  };
};

const useResponsiveDimension = (
  responsive: boolean,
  config: Record<string, unknown>,
  key: string,
) => {
  const [value, setValue] = useState<string>(config[key] as string);
  useEffect(() => {
    if (!responsive) return;
    const calc = () => {
      const w = window.innerWidth;
      let v = config[key] as string;
      if (w <= 480 && config[`mobile${key[0].toUpperCase() + key.slice(1)}`])
        v = config[`mobile${key[0].toUpperCase() + key.slice(1)}`] as string;
      else if (w <= 768 && config[`tablet${key[0].toUpperCase() + key.slice(1)}`])
        v = config[`tablet${key[0].toUpperCase() + key.slice(1)}`] as string;
      else if (w <= 1024 && config[`desktop${key[0].toUpperCase() + key.slice(1)}`])
        v = config[`desktop${key[0].toUpperCase() + key.slice(1)}`] as string;
      setValue(v);
    };
    const debounced = debounce(calc, 100);
    calc();
    window.addEventListener("resize", debounced);
    return () => window.removeEventListener("resize", debounced);
  }, [responsive, config, key]);
  return responsive ? value : (config[key] as string);
};

const useIntersectionObserver = (
  ref: React.RefObject<HTMLDivElement | null>,
  shouldObserve = false,
) => {
  const [isVisible, setIsVisible] = useState(!shouldObserve);

  useEffect(() => {
    if (!shouldObserve || !ref.current) return;

    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), {
      threshold: 0.1,
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, shouldObserve]);

  return isVisible;
};

function GradualBlur(props: GradualBlurProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  const config = useMemo(() => {
    const presetConfig = props.preset && PRESETS[props.preset] ? PRESETS[props.preset] : {};
    return mergeConfigs(DEFAULT_CONFIG, presetConfig, { ...props });
  }, [props]);

  const responsiveHeight = useResponsiveDimension(Boolean(config.responsive), config, "height");
  const responsiveWidth = useResponsiveDimension(Boolean(config.responsive), config, "width");

  const isVisible = useIntersectionObserver(containerRef, config.animated === "scroll");

  const blurDivs = useMemo(() => {
    const divs: React.ReactElement[] = [];
    const increment = 100 / Number(config.divCount);
    const currentStrength =
      isHovered && config.hoverIntensity
        ? Number(config.strength) * Number(config.hoverIntensity)
        : Number(config.strength);

    const curveFunc = CURVE_FUNCTIONS[String(config.curve)] || CURVE_FUNCTIONS.linear;
    const divCount = Number(config.divCount);
    const opacity = Number(config.opacity);

    for (let i = 1; i <= divCount; i++) {
      let progress = i / divCount;
      progress = curveFunc(progress);

      let blurValue: number;
      if (config.exponential) {
        blurValue = Math.pow(2, progress * 4) * 0.0625 * currentStrength;
      } else {
        blurValue = 0.0625 * (progress * divCount + 1) * currentStrength;
      }

      const p1 = Math.round((increment * i - increment) * 10) / 10;
      const p2 = Math.round(increment * i * 10) / 10;
      const p3 = Math.round((increment * i + increment) * 10) / 10;
      const p4 = Math.round((increment * i + increment * 2) * 10) / 10;

      let gradient = `transparent ${p1}%, black ${p2}%`;
      if (p3 <= 100) gradient += `, black ${p3}%`;
      if (p4 <= 100) gradient += `, transparent ${p4}%`;

      const direction = getGradientDirection(String(config.position));

      const divStyle: React.CSSProperties = {
        position: "absolute",
        inset: "0",
        maskImage: `linear-gradient(${direction}, ${gradient})`,
        WebkitMaskImage: `linear-gradient(${direction}, ${gradient})`,
        backdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
        WebkitBackdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
        opacity,
        transition:
          config.animated && config.animated !== "scroll"
            ? `backdrop-filter ${config.duration} ${config.easing}`
            : undefined,
      };

      divs.push(<div key={i} style={divStyle} />);
    }

    return divs;
  }, [config, isHovered]);

  const containerStyle = useMemo(() => {
    const isVertical = ["top", "bottom"].includes(String(config.position));
    const isHorizontal = ["left", "right"].includes(String(config.position));
    const isPageTarget = config.target === "page";

    const baseStyle: Record<string, unknown> = {
      position: isPageTarget ? "fixed" : "absolute",
      pointerEvents: config.hoverIntensity ? "auto" : "none",
      opacity: isVisible ? 1 : 0,
      transition: config.animated ? `opacity ${config.duration} ${config.easing}` : undefined,
      zIndex: isPageTarget ? Number(config.zIndex) + 100 : Number(config.zIndex),
      ...(config.style as Record<string, unknown>),
    };

    if (isVertical) {
      baseStyle.height = responsiveHeight;
      baseStyle.width = responsiveWidth || "100%";
      baseStyle[String(config.position)] = 0;
      baseStyle.left = 0;
      baseStyle.right = 0;
    } else if (isHorizontal) {
      baseStyle.width = responsiveWidth || responsiveHeight;
      baseStyle.height = "100%";
      baseStyle[String(config.position)] = 0;
      baseStyle.top = 0;
      baseStyle.bottom = 0;
    }

    return baseStyle as React.CSSProperties;
  }, [config, responsiveHeight, responsiveWidth, isVisible]);

  const { animated, onAnimationComplete, duration } = config;

  useEffect(() => {
    if (isVisible && animated === "scroll" && onAnimationComplete) {
      const ms = parseFloat(String(duration)) * 1000;
      const t = window.setTimeout(() => (onAnimationComplete as () => void)(), ms);
      return () => clearTimeout(t);
    }
  }, [isVisible, animated, onAnimationComplete, duration]);

  return (
    <div
      ref={containerRef}
      className={`gradual-blur ${config.target === "page" ? "gradual-blur-page" : "gradual-blur-parent"} ${config.className}`}
      style={containerStyle}
      onMouseEnter={config.hoverIntensity ? () => setIsHovered(true) : undefined}
      onMouseLeave={config.hoverIntensity ? () => setIsHovered(false) : undefined}
    >
      <div
        className="gradual-blur-inner"
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
        }}
      >
        {blurDivs}
      </div>
    </div>
  );
}

const GradualBlurMemo = Object.assign(React.memo(GradualBlur), {
  displayName: "GradualBlur",
  PRESETS,
  CURVE_FUNCTIONS,
});

const injectStyles = () => {
  if (typeof document === "undefined") return;

  const styleId = "gradual-blur-styles";
  if (document.getElementById(styleId)) return;

  const styleElement = document.createElement("style");
  styleElement.id = styleId;
  styleElement.textContent = `
  .gradual-blur { pointer-events: none; transition: opacity 0.3s ease-out; }
  .gradual-blur-parent { overflow: hidden; }
  .gradual-blur-inner { pointer-events: none; }`;

  document.head.appendChild(styleElement);
};

if (typeof document !== "undefined") {
  injectStyles();
}

export default GradualBlurMemo;
