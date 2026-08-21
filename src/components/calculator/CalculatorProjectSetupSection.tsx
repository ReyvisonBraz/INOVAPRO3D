import { Zap } from "lucide-react";
import type {
  CalculatorPlate,
  CalculatorProject,
  ProjectValidationIssue,
} from "../../lib/calculatorProject";
import type { PricingSettings } from "../../lib/pricing";
import type { Material } from "../../types/domain";
import { Reveal } from "../ui/Reveal";
import { CalculatorProjectEditor } from "./CalculatorProjectEditor";
import { SlicerPasteBox } from "./SlicerPasteBox";
import { MachineStat, SectionCard } from "./primitives";

interface CalculatorProjectSetupSectionProps {
  project: CalculatorProject;
  materials: Material[];
  pricingSettings: PricingSettings;
  issues: ProjectValidationIssue[];
  fallbackPricePerKg: {
    pla: number;
    petg: number;
  };
  formattedTime: string;
  weightGrams: number;
  onProjectChange: (project: CalculatorProject) => void;
  onSlicerApply: (plates: CalculatorPlate[], mode: "REPLACE" | "APPEND") => void;
}

export function CalculatorProjectSetupSection({
  project,
  materials,
  pricingSettings,
  issues,
  fallbackPricePerKg,
  formattedTime,
  weightGrams,
  onProjectChange,
  onSlicerApply,
}: CalculatorProjectSetupSectionProps) {
  return (
    <Reveal delay={0}>
      <SectionCard
        icon={Zap}
        title="Início Rápido"
        subtitle="Dados do job atual — copie do Bambu Studio"
      >
        <SlicerPasteBox
          materials={materials}
          fallbackPricePerKg={fallbackPricePerKg}
          hasExistingPlates={project.plates.some((plate) => plate.filaments.length > 0)}
          onApply={onSlicerApply}
        />
        <div className="my-4 border-t border-white/[0.06]" />
        <CalculatorProjectEditor
          project={project}
          onChange={onProjectChange}
          materials={materials}
          pricingSettings={pricingSettings}
          issues={issues}
        />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <MachineStat label="Bandejas" value={`${project.plates.length}`} />
          <MachineStat label="Tempo total" value={formattedTime} />
          <MachineStat label="Peso total" value={`${weightGrams.toFixed(2)}g`} highlight />
        </div>
      </SectionCard>
    </Reveal>
  );
}
