import { z } from "zod";
import { SPLIT_TYPES } from "@/db/schema";

export const emailSchema = z.string().trim().toLowerCase().email().max(200);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const currencySchema = z.string().trim().toUpperCase().length(3);

export const signupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: emailSchema,
  password: z.string().min(8).max(200),
});
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1) });

export const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  currency: currencySchema.default("USD"),
});
export const updateGroupSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    currency: currencySchema,
    simplifyDebts: z.boolean(),
  })
  .partial();
export const joinSchema = z.object({ code: z.string().trim().min(1) });
export const addMemberSchema = z.object({ email: emailSchema });
export const removeMemberSchema = z.object({ userId: z.string().min(1) });

export const expenseSchema = z.object({
  description: z.string().trim().min(1).max(200),
  amountCents: z.number().int().positive(),
  paidBy: z.string().min(1),
  splitType: z.enum(SPLIT_TYPES),
  date: dateSchema,
  notes: z.string().trim().max(2000).nullish(),
  participants: z
    .array(z.object({ userId: z.string().min(1), value: z.number().nonnegative().optional() }))
    .min(1),
});

export const settlementSchema = z.object({
  fromUserId: z.string().min(1),
  toUserId: z.string().min(1),
  amountCents: z.number().int().positive(),
  date: dateSchema,
  note: z.string().trim().max(500).nullish(),
});
