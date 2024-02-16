import z from "zod";

export const zValidEmail = z.union([z.string().email(), z.string().regex(/@localhost$/)]);