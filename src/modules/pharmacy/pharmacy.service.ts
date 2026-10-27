import { supabase } from '../../config/supabase';
import {
  CreateDrugInput,
  UpdateDrugInput,
  AddStockInput,
  DispenseDrugsInput,
} from './pharmacy.schema';

// --- DRUGS ---
export const listDrugs = async (params?: { search?: string; category?: string }) => {
  let query = supabase
    .from('drugs')
    .select('*, stock:drug_stock(quantity, expiry_date)')
    .eq('is_active', true)
    .order('name');

  if (params?.search) {
    query = query.or(`name.ilike.%${params.search}%,generic_name.ilike.%${params.search}%`);
  }
  if (params?.category) {
    query = query.eq('category', params.category);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Compute total available non-expired quantity
  const today = new Date().toISOString().split('T')[0];
  return data.map((d: any) => {
    const totalStock = (d.stock || [])
      .filter((s: any) => s.expiry_date > today)
      .reduce((sum: number, s: any) => sum + (s.quantity || 0), 0);
    return {
      ...d,
      current_stock: totalStock,
      is_low_stock: totalStock <= d.reorder_level,
    };
  });
};

export const getDrugById = async (id: string) => {
  const { data, error } = await supabase
    .from('drugs')
    .select('*, stock:drug_stock(*)')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw Object.assign(new Error('Drug not found'), { status: 404 });
    throw error;
  }
  return data;
};

export const createDrug = async (input: CreateDrugInput) => {
  const { data, error } = await supabase
    .from('drugs')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
};

export const updateDrug = async (id: string, input: UpdateDrugInput) => {
  const { data, error } = await supabase
    .from('drugs')
    .update(input)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// --- STOCK ---
export const addStock = async (input: AddStockInput) => {
  const { data, error } = await supabase
    .from('drug_stock')
    .insert(input)
    .select('*, drug:drugs(id, name, unit)')
    .single();
  if (error) throw error;
  return data;
};

export const getLowStockAlerts = async () => {
  const drugs = await listDrugs();
  return drugs.filter((d: any) => d.is_low_stock);
};

// --- ATOMIC DISPENSE VIA DATABASE FUNCTION ---
export const dispenseDrugs = async (input: DispenseDrugsInput) => {
  // Calls the PostgreSQL PL/pgSQL function dispense_drugs()
  // Handles row locks, FIFO deduction by earliest expiry, and creates dispense order + items atomically!
  const { data: orderId, error } = await supabase.rpc('dispense_drugs', {
    p_patient_id: input.patient_id,
    p_prescription_id: input.prescription_id || null,
    p_dispensed_by: input.dispensed_by,
    p_items: input.items,
  });

  if (error) throw error;

  // Fetch the full created order
  return getDispenseOrderById(orderId);
};

export const getDispenseOrderById = async (id: string) => {
  const { data, error } = await supabase
    .from('dispense_orders')
    .select('*, patient:patients(id, uhid, first_name, last_name), items:dispense_order_items(*)')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw Object.assign(new Error('Dispense order not found'), { status: 404 });
    throw error;
  }
  return data;
};

export const listDispenseOrders = async (params: { patient_id?: string; page?: number; limit?: number }) => {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const offset = (page - 1) * limit;

  let query = supabase
    .from('dispense_orders')
    .select('*, patient:patients(id, uhid, first_name, last_name), items:dispense_order_items(*)', { count: 'exact' })
    .order('dispensed_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (params.patient_id) query = query.eq('patient_id', params.patient_id);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    orders: data,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      total_pages: Math.ceil((count ?? 0) / limit),
    },
  };
};
