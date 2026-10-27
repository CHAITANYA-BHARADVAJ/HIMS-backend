import { z } from 'zod';

export const consultationStatusEnum = z.enum(['open', 'completed', 'referred']);
export const referralPriorityEnum = z.enum(['routine', 'urgent', 'emergency']);

export const prescriptionItemInputSchema = z.object({
  drug_name: z.string().min(1, 'Drug name is required'),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  duration_days: z.number().int().positive().optional(),
  instructions: z.string().optional(),
});

export const referralInputSchema = z.object({
  referred_to_dept: z.string().optional(),
  referred_to_doctor: z.string().uuid('Invalid doctor UUID').optional().nullable(),
  reason: z.string().min(1, 'Referral reason is required'),
  priority: referralPriorityEnum.optional(),
});

export const createConsultationSchema = z.object({
  patient_id: z.string().uuid('Invalid patient UUID'),
  appointment_id: z.string().uuid('Invalid appointment UUID'),
  doctor_id: z.string().uuid('Invalid doctor UUID'),
  chief_complaint: z.string().optional(),
  history_of_illness: z.string().optional(),
  examination_notes: z.string().optional(),
  diagnosis: z.string().optional(),
  icd10_codes: z.array(z.string()).optional(),
  follow_up_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD').optional().nullable(),
  status: consultationStatusEnum.optional(),
  prescriptions: z.array(prescriptionItemInputSchema).optional(),
  referrals: z.array(referralInputSchema).optional(),
});

export const updateConsultationSchema = z.object({
  chief_complaint: z.string().optional(),
  history_of_illness: z.string().optional(),
  examination_notes: z.string().optional(),
  diagnosis: z.string().optional(),
  icd10_codes: z.array(z.string()).optional(),
  follow_up_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD').optional().nullable(),
  status: consultationStatusEnum.optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' });

export const addPrescriptionItemsSchema = z.object({
  items: z.array(prescriptionItemInputSchema).min(1, 'At least one item required'),
});

export const updateDispensedSchema = z.object({
  dispensed: z.boolean(),
});

export type CreateConsultationInput = z.infer<typeof createConsultationSchema>;
export type UpdateConsultationInput = z.infer<typeof updateConsultationSchema>;
export type PrescriptionItemInput = z.infer<typeof prescriptionItemInputSchema>;
export type ReferralInput = z.infer<typeof referralInputSchema>;
