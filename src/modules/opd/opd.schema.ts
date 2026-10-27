import { z } from 'zod';

export const appointmentStatusEnum = z.enum([
  'scheduled',
  'checked_in',
  'in_progress',
  'completed',
  'cancelled',
  'no_show',
]);

// Departments
export const createDepartmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().min(1, 'Code is required').max(20).toUpperCase(),
  is_active: z.boolean().optional(),
});

// Doctors
export const createDoctorSchema = z.object({
  user_id: z.string().uuid('Invalid user UUID (Auth / Keycloak user ID)'),
  full_name: z.string().min(1, 'Full name is required').max(150),
  specialization: z.string().max(100).optional(),
  department_id: z.string().uuid('Invalid department UUID'),
  is_available: z.boolean().optional(),
});

export const updateDoctorSchema = z.object({
  full_name: z.string().min(1).max(150).optional(),
  specialization: z.string().max(100).optional(),
  department_id: z.string().uuid().optional(),
  is_available: z.boolean().optional(),
}).refine((d) => Object.keys(d).length > 0, { message: 'At least one field required' });

// Appointments
export const createAppointmentSchema = z.object({
  patient_id: z.string().uuid('Invalid patient UUID'),
  doctor_id: z.string().uuid('Invalid doctor UUID').optional().nullable(),
  department_id: z.string().uuid('Invalid department UUID'),
  scheduled_at: z.string().datetime({ message: 'Must be ISO 8601 datetime' }),
  status: appointmentStatusEnum.optional(),
  notes: z.string().max(1000).optional(),
});

export const updateAppointmentStatusSchema = z.object({
  status: appointmentStatusEnum,
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
export type UpdateDoctorInput = z.infer<typeof updateDoctorSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof updateAppointmentStatusSchema>;
