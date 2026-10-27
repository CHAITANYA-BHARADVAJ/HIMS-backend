import { z } from 'zod';

export const labOrderStatusEnum = z.enum([
  'pending',
  'sample_collected',
  'processing',
  'resulted',
  'delivered',
]);

export const labPriorityEnum = z.enum(['routine', 'urgent', 'stat']);

// Catalog
export const createLabTestSchema = z.object({
  test_name: z.string().min(1, 'Test name is required'),
  test_code: z.string().min(1, 'Test code is required').toUpperCase(),
  category: z.string().optional(),
  default_unit: z.string().optional(),
  reference_range: z.string().optional(),
  price: z.number().min(0).default(0),
});

// Order items
export const labOrderItemInputSchema = z.object({
  test_id: z.string().uuid('Invalid test UUID'),
  test_name: z.string().optional(),
});

// Create Order
export const createLabOrderSchema = z.object({
  patient_id: z.string().uuid('Invalid patient UUID'),
  consultation_id: z.string().uuid('Invalid consultation UUID').optional().nullable(),
  ordered_by: z.string().uuid('Invalid doctor UUID'),
  priority: labPriorityEnum.optional().default('routine'),
  items: z.array(labOrderItemInputSchema).min(1, 'At least one test must be ordered'),
});

// Update Order Status
export const updateLabOrderStatusSchema = z.object({
  status: labOrderStatusEnum,
});

// Update Item Result
export const updateLabItemResultSchema = z.object({
  result_value: z.string().min(1, 'Result value is required'),
  result_unit: z.string().optional(),
  reference_range: z.string().optional(),
  is_abnormal: z.boolean().default(false),
});

// Attach Report Path
export const attachReportSchema = z.object({
  report_path: z.string().min(1, 'Report path is required'),
  report_file_name: z.string().min(1, 'File name is required'),
  report_uploaded_by: z.string().uuid('Invalid uploader UUID'),
});

export type CreateLabTestInput = z.infer<typeof createLabTestSchema>;
export type CreateLabOrderInput = z.infer<typeof createLabOrderSchema>;
export type UpdateLabOrderStatusInput = z.infer<typeof updateLabOrderStatusSchema>;
export type UpdateLabItemResultInput = z.infer<typeof updateLabItemResultSchema>;
export type AttachReportInput = z.infer<typeof attachReportSchema>;
