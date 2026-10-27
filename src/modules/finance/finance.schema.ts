import { z } from 'zod';

export const invoiceStatusEnum = z.enum([
  'draft',
  'issued',
  'partially_paid',
  'paid',
  'cancelled',
]);

export const chargeTypeEnum = z.enum([
  'consultation',
  'lab',
  'pharmacy',
  'procedure',
  'misc',
]);

export const paymentMethodEnum = z.enum([
  'cash',
  'card',
  'upi',
  'insurance',
  'waiver',
]);

export const lineItemInputSchema = z.object({
  charge_type: chargeTypeEnum,
  description: z.string().min(1, 'Description is required'),
  source_id: z.string().uuid().optional().nullable(),
  quantity: z.number().int().min(1).default(1),
  unit_price: z.number().min(0, 'Unit price must be non-negative'),
});

export const paymentInputSchema = z.object({
  amount: z.number().min(0.01, 'Payment amount must be at least 0.01'),
  method: paymentMethodEnum,
  reference_no: z.string().optional().nullable(),
  collected_by: z.string().uuid('Invalid collector UUID'),
});

export const createInvoiceSchema = z.object({
  patient_id: z.string().uuid('Invalid patient UUID'),
  visit_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD required'),
  discount_amount: z.number().min(0).default(0),
  tax_amount: z.number().min(0).default(0),
  line_items: z.array(lineItemInputSchema).optional(),
});

export const addLineItemsSchema = z.object({
  items: z.array(lineItemInputSchema).min(1, 'At least one item required'),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type LineItemInput = z.infer<typeof lineItemInputSchema>;
export type PaymentInput = z.infer<typeof paymentInputSchema>;
