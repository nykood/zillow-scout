import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Settings2, RotateCcw } from "lucide-react";
import type { ScoringWeights } from "@/types/listing";
import { DEFAULT_WEIGHTS } from "@/types/listing";

interface WeightsPanelProps {
  weights: ScoringWeights;
  onWeightsChange: (weights: ScoringWeights) => void;
}

function WeightSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <span className="text-sm font-medium text-muted-foreground">{value}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={0}
        max={10}
        step={1}
        className="w-full"
      />
    </div>
  );
}

export function WeightsPanel({ weights, onWeightsChange }: WeightsPanelProps) {
  const handleReset = () => {
    onWeightsChange(DEFAULT_WEIGHTS);
  };

  const updateWeight = (key: keyof ScoringWeights, value: number) => {
    onWeightsChange({ ...weights, [key]: value });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings2 className="h-4 w-4" />
          Scoring Weights
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Customize Scoring</SheetTitle>
          <SheetDescription>
            Adjust the importance of each factor in the overall score calculation.
            Higher values mean that factor matters more to you.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
              Property Basics
            </h3>
            <div className="space-y-4">
              <WeightSlider
                label="Price (lower is better)"
                value={weights.price}
                onChange={(v) => updateWeight("price", v)}
              />
              <WeightSlider
                label="Size (sqft)"
                value={weights.size}
                onChange={(v) => updateWeight("size", v)}
              />
              <WeightSlider
                label="Bedrooms"
                value={weights.beds}
                onChange={(v) => updateWeight("beds", v)}
              />
              <WeightSlider
                label="Bathrooms"
                value={weights.baths}
                onChange={(v) => updateWeight("baths", v)}
              />
              <WeightSlider
                label="Price per Sqft (lower is better)"
                value={weights.pricePerSqft}
                onChange={(v) => updateWeight("pricePerSqft", v)}
              />
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wide">
              Location & Safety
            </h3>
            <div className="space-y-4">
              <WeightSlider
                label="Average School Rating"
                value={weights.avgSchoolRating}
                onChange={(v) => updateWeight("avgSchoolRating", v)}
              />
              <WeightSlider
                label="Commute Time (lower is better)"
                value={weights.commuteTime}
                onChange={(v) => updateWeight("commuteTime", v)}
              />
              <WeightSlider
                label="Garage Size"
                value={weights.garageSize}
                onChange={(v) => updateWeight("garageSize", v)}
              />
              <WeightSlider
                label="Flood Risk (low risk is better)"
                value={weights.floodRisk}
                onChange={(v) => updateWeight("floodRisk", v)}
              />
            </div>
          </div>

          <Button variant="outline" className="w-full gap-2" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
