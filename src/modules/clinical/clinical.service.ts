import { supabase } from '../../config/supabase';
import {
  CreateConsultationInput,
  UpdateConsultationInput,
  PrescriptionItemInput,
  ReferralInput,
} from './clinical.schema';

export const createConsultation = async (input: CreateConsultationInput) => {
  const { prescriptions, referrals, ...consultationData } = input;

  // Insert consultation
  const { data: consultation, error } = await supabase
    .from('consultations')
    .insert(consultationData)
    .select()
    .single();

  if (error) throw error;

  // Insert embedded prescription items if provided
  let insertedPrescriptions: any[] = [];
  if (prescriptions && prescriptions.length > 0) {
    const items = prescriptions.map((p) => ({
      ...p,
      consultation_id: consultation.id,
    }));
    const { data, error: presError } = await supabase
      .from('prescription_items')
      .insert(items)
      .select();
    if (presError) throw presError;
    insertedPrescriptions = data || [];
  }

  // Insert embedded referrals if provided
  let insertedReferrals: any[] = [];
  if (referrals && referrals.length > 0) {
    const items = referrals.map((r) => ({
      ...r,
      consultation_id: consultation.id,
    }));
    const { data, error: refError } = await supabase
      .from('referrals')
      .insert(items)
      .select();
    if (refError) throw refError;
    insertedReferrals = data || [];
  }

  return {
    ...consultation,
    prescriptions: insertedPrescriptions,
    referrals: insertedReferrals,
  };
};

export const listConsultations = async (params: {
  patient_id?: string;
  doctor_id?: string;
  status?: string;
  page?: number;
  limit?: number;
}) => {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const offset = (page - 1) * limit;

  let query = supabase
    .from('consultations')
    .select(
      '*, patient:patients(id, uhid, first_name, last_name), doctor:doctors(id, full_name), prescriptions:prescription_items(*), referrals:referrals(*)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (params.patient_id) query = query.eq('patient_id', params.patient_id);
  if (params.doctor_id) query = query.eq('doctor_id', params.doctor_id);
  if (params.status) query = query.eq('status', params.status);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    consultations: data,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      total_pages: Math.ceil((count ?? 0) / limit),
    },
  };
};

export const getConsultationById = async (id: string) => {
  const { data, error } = await supabase
    .from('consultations')
    .select(
      '*, patient:patients(*), doctor:doctors(id, full_name, specialization), appointment:appointments(*), prescriptions:prescription_items(*), referrals:referrals(*)'
    )
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw Object.assign(new Error('Consultation not found'), { status: 404 });
    throw error;
  }
  return data;
};

export const getConsultationByAppointment = async (appointmentId: string) => {
  const { data, error } = await supabase
    .from('consultations')
    .select(
      '*, patient:patients(*), doctor:doctors(id, full_name, specialization), prescriptions:prescription_items(*), referrals:referrals(*)'
    )
    .eq('appointment_id', appointmentId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw Object.assign(new Error('Consultation not found for this appointment'), { status: 404 });
    throw error;
  }
  return data;
};

export const updateConsultation = async (id: string, input: UpdateConsultationInput) => {
  const { data, error } = await supabase
    .from('consultations')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const addPrescriptions = async (consultationId: string, items: PrescriptionItemInput[]) => {
  const rows = items.map((i) => ({ ...i, consultation_id: consultationId }));
  const { data, error } = await supabase
    .from('prescription_items')
    .insert(rows)
    .select();

  if (error) throw error;
  return data;
};

export const updatePrescriptionDispensed = async (itemId: string, dispensed: boolean) => {
  const { data, error } = await supabase
    .from('prescription_items')
    .update({ dispensed })
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const addReferral = async (consultationId: string, item: ReferralInput) => {
  const { data, error } = await supabase
    .from('referrals')
    .insert({ ...item, consultation_id: consultationId })
    .select()
    .single();

  if (error) throw error;
  return data;
};
