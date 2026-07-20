import type { RoutineGenerator } from "@/lib/routines/types";
import { RuleBasedRoutineGenerator } from "@/lib/routines/ruleBasedGenerator";
import { ClaudeRoutineGenerator } from "@/lib/routines/claudeGenerator";

export function getRoutineGenerator(): RoutineGenerator {
  const strategy = process.env.ROUTINE_GENERATOR_STRATEGY ?? "rule-based";
  switch (strategy) {
    case "claude":
      return new ClaudeRoutineGenerator();
    case "rule-based":
    default:
      return new RuleBasedRoutineGenerator();
  }
}
