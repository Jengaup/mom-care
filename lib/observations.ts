import type { Enums } from "@/types/database";

export type ObsType = Enums<"observation_type">;
export type ObsKind = "num" | "text" | "pain";

export const OBS_CONFIG: Record<
  ObsType,
  { label: string; kind: ObsKind; unit?: string }
> = {
  weight: { label: "Peso", kind: "num", unit: "lb" },
  blood_pressure: { label: "Presión arterial", kind: "text", unit: "mmHg" },
  temperature: { label: "Temperatura", kind: "num", unit: "°F" },
  glucose: { label: "Glucosa", kind: "num", unit: "mg/dL" },
  heart_rate: { label: "Pulso", kind: "num", unit: "lpm" },
  oxygen: { label: "Oxígeno", kind: "num", unit: "%" },
  pain: { label: "Dolor (0–10)", kind: "pain" },
  fluid_intake: { label: "Líquidos — entrada", kind: "num", unit: "mL" },
  fluid_output: { label: "Líquidos — salida", kind: "num", unit: "mL" },
  bowel: { label: "Deposición", kind: "text" },
  skin: { label: "Piel / úlceras", kind: "text" },
  mood: { label: "Ánimo", kind: "text" },
  other: { label: "Otro", kind: "text" },
};

export const OBS_ORDER: ObsType[] = [
  "blood_pressure",
  "heart_rate",
  "temperature",
  "glucose",
  "oxygen",
  "weight",
  "pain",
  "fluid_intake",
  "fluid_output",
  "bowel",
  "skin",
  "mood",
  "other",
];

/** Texto legible del valor de una observación. */
export function formatObsValue(
  type: ObsType,
  valueNum: number | null,
  valueText: string | null,
  unit: string | null,
): string {
  const cfg = OBS_CONFIG[type];
  if (cfg.kind === "pain") return `${valueNum ?? "—"}/10`;
  if (cfg.kind === "num") {
    return valueNum != null ? `${valueNum} ${unit ?? cfg.unit ?? ""}`.trim() : "—";
  }
  return valueText || "—";
}
