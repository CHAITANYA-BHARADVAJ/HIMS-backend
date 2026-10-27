import { z } from 'zod';

export const drugUnitEnum = z.enum([
  'tablet',
  'capsule',
  'vial',
  'ml',
  'mg',
  'sachet',
  'tube',
  'strip',
]);

export const createDrugSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  generic_name: z.string().optional(),
  category: z.string().optional(),
  unit: drugUnitEnum,
  price_per_unit: z.number().min(0, 'Price must be non-negative'),
  reorder_level: z.number().int().min(0).default(10),
});

export const updateDrugSchema = z.object({
  name: z.string().min(1).optional(),
  generic_name: z.string().optional(),
  category: z.string().optional(),
  unit: drugUnitEnum.optional(),
  price_per_unit: z.number().min(0).optional(),
  reorder_level: z.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' });

export const addStockSchema = z.object({
  drug_id: z.string().uuid('Invalid drug UUID'),
  batch_number: z.string().min(1, 'Batch number is required'),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD required'),
  quantity: z.number().int().positive('Quantity must be greater than 0'),
});

export const dispenseItemSchema = z.object({
  drug_id: z.string().uuid('Invalid drug UUID'),
  drug_name: z.string().min(1, 'Drug name is required'),
  quantity: z.number().int().positive('Quantity must be positive'),
});

export const dispenseDrugsSchema = z.object({
  patient_id: z.string().uuid('Invalid patient UUID'),
  prescription_id: z.string().uuid('Invalid prescription UUID').optional().nullable(),
  dispensed_by: z.string().uuid('Invalid user UUID (pharmacist)'),
  items: z.array(dispenseItemSchema).min(1, 'At least one item required'),
});

export type CreateDrugInput = z.infer<typeof createDrugSchema>;
export type UpdateDrugInput = z.infer<typeof updateDrugSchema>;
export type AddStockInput = z.infer<typeof addStockSchema>;
export type DispenseDrugsInput = z.infer<typeof dispenseDrugsSchema>;
