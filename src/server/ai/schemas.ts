import { Type, type Schema } from "@google/genai";

export const S: Schema = { type: Type.STRING };
export const I: Schema = { type: Type.INTEGER };
export const B: Schema = { type: Type.BOOLEAN };

export const en = (v: readonly string[]): Schema => ({
  type: Type.STRING,
  enum: [...v],
});

export const nul = (s: Schema): Schema => ({
  ...s,
  nullable: true,
});

export const obj = (p: Record<string, Schema>): Schema => ({
  type: Type.OBJECT,
  properties: p,
  required: Object.keys(p),
  propertyOrdering: Object.keys(p),
});

export const arr = (items: Schema, min?: number, max?: number): Schema => ({
  type: Type.ARRAY,
  items,
  ...(min !== undefined && { minItems: String(min) }),
  ...(max !== undefined && { maxItems: String(max) }),
});
