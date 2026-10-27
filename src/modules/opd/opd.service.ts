import { supabase } from '../../config/supabase';
import {
  CreateDepartmentInput,
  CreateDoctorInput,
  UpdateDoctorInput,
  CreateAppointmentInput,
  UpdateAppointmentStatusInput,
} from './opd.schema';

// --- DEPARTMENTS ---
export const listDepartments = async () => {
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data;
};

export const createDepartment = async (input: CreateDepartmentInput) => {
  const { data, error } = await supabase
    .from('departments')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// --- DOCTORS ---
export const listDoctors = async (filter?: { department_id?: string; is_available?: boolean }) => {
  let query = supabase
    .from('doctors')
    .select('*, department:departments(id, name, code)')
    .order('full_name');

  if (filter?.department_id) {
    query = query.eq('department_id', filter.department_id);
  }
  if (filter?.is_available !== undefined) {
    query = query.eq('is_available', filter.is_available);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const getDoctorById = async (id: string) => {
  const { data, error } = await supabase
    .from('doctors')
    .select('*, department:departments(id, name, code)')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw Object.assign(new Error('Doctor not found'), { status: 404 });
    throw error;
  }
  return data;
};

export const createDoctor = async (input: CreateDoctorInput) => {
  const { data, error } = await supabase
    .from('doctors')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateDoctor = async (id: string, input: UpdateDoctorInput) => {
  const { data, error } = await supabase
    .from('doctors')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// --- APPOINTMENTS ---
export const createAppointment = async (input: CreateAppointmentInput) => {
  // DB trigger auto-assigns token_number
  const { data, error } = await supabase
    .from('appointments')
    .insert(input)
    .select('*, patient:patients(id, uhid, first_name, last_name, phone), doctor:doctors(id, full_name), department:departments(id, name, code)')
    .single();
  if (error) throw error;
  return data;
};

export const listAppointments = async (params: {
  patient_id?: string;
  doctor_id?: string;
  department_id?: string;
  date?: string;
  status?: string;
  page?: number;
  limit?: number;
}) => {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const offset = (page - 1) * limit;

  let query = supabase
    .from('appointments')
    .select(
      '*, patient:patients(id, uhid, first_name, last_name, phone), doctor:doctors(id, full_name), department:departments(id, name, code)',
      { count: 'exact' }
    )
    .order('scheduled_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (params.patient_id) query = query.eq('patient_id', params.patient_id);
  if (params.doctor_id) query = query.eq('doctor_id', params.doctor_id);
  if (params.department_id) query = query.eq('department_id', params.department_id);
  if (params.status) query = query.eq('status', params.status);
  if (params.date) {
    const startOfDay = `${params.date}T00:00:00.000Z`;
    const endOfDay = `${params.date}T23:59:59.999Z`;
    query = query.gte('scheduled_at', startOfDay).lte('scheduled_at', endOfDay);
  }

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    appointments: data,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      total_pages: Math.ceil((count ?? 0) / limit),
    },
  };
};

export const getAppointmentById = async (id: string) => {
  const { data, error } = await supabase
    .from('appointments')
    .select('*, patient:patients(id, uhid, first_name, last_name, phone), doctor:doctors(id, full_name), department:departments(id, name, code)')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw Object.assign(new Error('Appointment not found'), { status: 404 });
    throw error;
  }
  return data;
};

export const updateAppointmentStatus = async (id: string, input: UpdateAppointmentStatusInput) => {
  const { data, error } = await supabase
    .from('appointments')
    .update({ status: input.status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const getDepartmentQueue = async (departmentId: string, dateStr: string) => {
  const startOfDay = `${dateStr}T00:00:00.000Z`;
  const endOfDay = `${dateStr}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from('appointments')
    .select('id, token_number, status, scheduled_at, patient:patients(id, uhid, first_name, last_name), doctor:doctors(id, full_name)')
    .eq('department_id', departmentId)
    .gte('scheduled_at', startOfDay)
    .lte('scheduled_at', endOfDay)
    .order('token_number', { ascending: true });

  if (error) throw error;
  return data;
};
