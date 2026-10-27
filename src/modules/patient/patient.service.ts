import { supabase } from '../../config/supabase';
import { CreatePatientInput, UpdatePatientInput } from './patient.schema';

export const createPatient = async (data: CreatePatientInput) => {
  const { data: patient, error } = await supabase
    .from('patients')
    .insert(data)
    .select()
    .single();

  if (error) throw error;
  return patient;
};

export const listPatients = async (params: {
  search?: string;
  page: number;
  limit: number;
}) => {
  const { search, page, limit } = params;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('patients')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
  }

  const { data: patients, error, count } = await query;

  if (error) throw error;

  return {
    patients,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      total_pages: Math.ceil((count ?? 0) / limit),
    },
  };
};

export const getPatientById = async (id: string) => {
  const { data: patient, error } = await supabase
    .from('patients')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw Object.assign(new Error('Patient not found'), { status: 404 });
    }
    throw error;
  }

  return patient;
};

export const getPatientByUhid = async (uhid: string) => {
  const { data: patient, error } = await supabase
    .from('patients')
    .select('*')
    .eq('uhid', uhid)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw Object.assign(new Error('Patient not found'), { status: 404 });
    }
    throw error;
  }

  return patient;
};

export const updatePatient = async (id: string, data: UpdatePatientInput) => {
  const { data: patient, error } = await supabase
    .from('patients')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw Object.assign(new Error('Patient not found'), { status: 404 });
    }
    throw error;
  }

  return patient;
};

export const softDeletePatient = async (id: string) => {
  const { data: patient, error } = await supabase
    .from('patients')
    .update({ is_active: false })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw Object.assign(new Error('Patient not found'), { status: 404 });
    }
    throw error;
  }

  return patient;
};
