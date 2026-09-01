import GradualBlur from "../ui/GradualBlur";
import ShapeGrid from "../ui/ShapeGrid";

interface AppBackgroundEffectsProps {
  theme: "light" | "dark";
}

/**
 * Efeitos puramente decorativos carregados depois do conteúdo crítico.
 * O gradiente-base permanece no App, então não há flash de fundo enquanto
 * este chunk assíncrono é baixado e inicializado.
 */
export default function AppBackgroundEffects({ theme }: AppBackgroundEffectsProps) {
  const gridBorderColor = theme === "dark" ? "rgba(148, 163, 184, 0.14)" : "rgba(15, 23, 42, 0.14)";
  const gridHoverColor = theme === "dark" ? "rgba(59, 130, 246, 0.18)" : "rgba(37, 99, 235, 0.14)";

  return (
    <>
      <ShapeGrid
        direction="diagonal"
        speed={0.25}
        squareSize={48}
        shape="hexagon"
        borderColor={gridBorderColor}
        hoverFillColor={gridHoverColor}
      />
      <GradualBlur
        position="top"
        target="parent"
        height="6rem"
        strength={2}
        divCount={5}
        curve="bezier"
        className="bg-fade-top"
      />
      <GradualBlur
        position="bottom"
        target="parent"
        height="6rem"
        strength={2}
        divCount={5}
        curve="bezier"
        className="bg-fade-bottom"
      />
    </>
  );
}
