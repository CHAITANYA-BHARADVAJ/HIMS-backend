import { supabase } from '../../config/supabase';
import {
  CreateLabTestInput,
  CreateLabOrderInput,
  UpdateLabOrderStatusInput,
  UpdateLabItemResultInput,
  AttachReportInput,
} from './lims.schema';

// --- CATALOG ---
export const listLabTests = async () => {
  const { data, error } = await supabase
    .from('lab_tests_catalog')
    .select('*')
    .eq('is_active', true)
    .order('category', { ascending: true });
  if (error) throw error;
  return data;
};

export const createLabTest = async (input: CreateLabTestInput) => {
  const { data, error } = await supabase
    .from('lab_tests_catalog')
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data;
};

// --- ORDERS ---
export const createLabOrder = async (input: CreateLabOrderInput) => {
  const { items, ...orderData } = input;

  const { data: order, error: orderError } = await supabase
    .from('lab_orders')
    .insert(orderData)
    .select()
    .single();

  if (orderError) throw orderError;

  // Insert items
  const orderItems = items.map((it) => ({
    lab_order_id: order.id,
    test_id: it.test_id,
    test_name: it.test_name,
  }));

  const { data: insertedItems, error: itemsError } = await supabase
    .from('lab_order_items')
    .insert(orderItems)
    .select();

  if (itemsError) throw itemsError;

  return { ...order, items: insertedItems };
};

export const listLabOrders = async (params: {
  patient_id?: string;
  status?: string;
  priority?: string;
  page?: number;
  limit?: number;
}) => {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const offset = (page - 1) * limit;

  let query = supabase
    .from('lab_orders')
    .select(
      '*, patient:patients(id, uhid, first_name, last_name), doctor:doctors(id, full_name), items:lab_order_items(*)',
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (params.patient_id) query = query.eq('patient_id', params.patient_id);
  if (params.status) query = query.eq('status', params.status);
  if (params.priority) query = query.eq('priority', params.priority);

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

export const getLabOrderById = async (id: string) => {
  const { data, error } = await supabase
    .from('lab_orders')
    .select(
      '*, patient:patients(id, uhid, first_name, last_name, phone), doctor:doctors(id, full_name), items:lab_order_items(*)'
    )
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw Object.assign(new Error('Lab order not found'), { status: 404 });
    throw error;
  }
  return data;
};

export const updateLabOrderStatus = async (id: string, input: UpdateLabOrderStatusInput) => {
  const { data, error } = await supabase
    .from('lab_orders')
    .update({ status: input.status })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateLabItemResult = async (itemId: string, input: UpdateLabItemResultInput) => {
  const { data, error } = await supabase
    .from('lab_order_items')
    .update({
      ...input,
      resulted_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Report storage (replaces S3 presigned URL pattern)
export const attachReport = async (orderId: string, input: AttachReportInput) => {
  const { data, error } = await supabase
    .from('lab_orders')
    .update({
      report_path: input.report_path,
      report_file_name: input.report_file_name,
      report_uploaded_by: input.report_uploaded_by,
      report_uploaded_at: new Date().toISOString(),
      status: 'delivered',
    })
    .eq('id', orderId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getReportDownloadUrl = async (orderId: string) => {
  const order = await getLabOrderById(orderId);
  if (!order.report_path) {
    throw Object.assign(new Error('No report attached to this order'), { status: 404 });
  }

  // Generates 5-minute signed URL from Supabase Storage (just like S3 getSignedUrlPromise)
  const { data, error } = await supabase.storage
    .from('lab-reports')
    .createSignedUrl(order.report_path, 300);

  if (error) throw error;
  return { signedUrl: data.signedUrl, fileName: order.report_file_name };
};
