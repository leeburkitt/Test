import Anthropic from "@anthropic-ai/sdk";
import { equipmentCategoryValues } from "@/lib/db/schema";

const client = new Anthropic();
const MODEL = process.env.EQUIPMENT_VISION_MODEL ?? "claude-opus-4-8";

export type ScannedLabel = { name: string; category: string; notes?: string };

const outputFormat = {
  type: "json_schema" as const,
  schema: {
    type: "object",
    properties: {
      name: { type: "string" },
      category: { type: "string", enum: equipmentCategoryValues },
      notes: { type: "string" },
    },
    required: ["name", "category"],
    additionalProperties: false,
  },
};

function parseScannedLabel(response: Anthropic.Message): ScannedLabel {
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from AI");
  }
  return JSON.parse(textBlock.text) as ScannedLabel;
}

export async function scanEquipmentLabel(base64: string, mimeType: string): Promise<ScannedLabel> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mimeType as "image/jpeg", data: base64 },
          },
          {
            type: "text",
            text:
              "Photo of a gym equipment label/nameplate. Extract its name (include brand/model if visible) and classify it into one of: " +
              equipmentCategoryValues.join(", ") +
              ".",
          },
        ],
      },
    ],
    output_config: { format: outputFormat },
  });

  return parseScannedLabel(response);
}

export async function scanEquipmentDescription(description: string): Promise<ScannedLabel> {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content:
          `A user typed this short description of a piece of gym equipment: "${description}". ` +
          "Write a clean equipment name (include brand/model if mentioned) and classify it into one of: " +
          equipmentCategoryValues.join(", ") +
          ".",
      },
    ],
    output_config: { format: outputFormat },
  });

  return parseScannedLabel(response);
}
