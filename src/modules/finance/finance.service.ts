import { supabase } from '../../config/supabase';
import {
  CreateInvoiceInput,
  LineItemInput,
  PaymentInput,
} from './finance.schema';

export const createInvoice = async (input: CreateInvoiceInput) => {
  const { line_items, ...invoiceData } = input;

  const { data: invoice, error: invError } = await supabase
    .from('invoices')
    .insert({
      ...invoiceData,
      status: 'draft',
      total_amount: 0,
    })
    .select()
    .single();

  if (invError) throw invError;

  let insertedItems: any[] = [];
  if (line_items && line_items.length > 0) {
    const rows = line_items.map((li) => ({
      ...li,
      invoice_id: invoice.id,
    }));
    const { data, error: itemError } = await supabase
      .from('invoice_line_items')
      .insert(rows)
      .select();
    if (itemError) throw itemError;
    insertedItems = data || [];

    // Compute initial total
    const subtotal = insertedItems.reduce((acc, it) => acc + Number(it.line_total || it.quantity * it.unit_price), 0);
    const total = subtotal - (invoice.discount_amount || 0) + (invoice.tax_amount || 0);
    await supabase.from('invoices').update({ total_amount: total }).eq('id', invoice.id);
    invoice.total_amount = total;
  }

  return { ...invoice, line_items: insertedItems, payments: [] };
};

export const listInvoices = async (params: {
  patient_id?: string;
  status?: string;
  page?: number;
  limit?: number;
}) => {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 20));
  const offset = (page - 1) * limit;

  let query = supabase
    .from('invoices')
    .select(
      '*, patient:patients(id, uhid, first_name, last_name), line_items:invoice_line_items(*), payments:invoice_payments(*)',
      { count: 'exact' }
    )
    .order('visit_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (params.patient_id) query = query.eq('patient_id', params.patient_id);
  if (params.status) query = query.eq('status', params.status);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    invoices: data,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      total_pages: Math.ceil((count ?? 0) / limit),
    },
  };
};

export const getInvoiceById = async (id: string) => {
  const { data, error } = await supabase
    .from('invoices')
    .select(
      '*, patient:patients(*), line_items:invoice_line_items(*), payments:invoice_payments(*)'
    )
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') throw Object.assign(new Error('Invoice not found'), { status: 404 });
    throw error;
  }

  // Also query the summary view for this invoice
  const { data: summary } = await supabase
    .from('invoice_summary')
    .select('*')
    .eq('id', id)
    .single();

  return { ...data, summary };
};

export const getPatientInvoiceSummaries = async (patientId: string) => {
  const { data, error } = await supabase
    .from('invoice_summary')
    .select('*')
    .eq('patient_id', patientId)
    .order('visit_date', { ascending: false });

  if (error) throw error;
  return data;
};

export const addLineItems = async (invoiceId: string, items: LineItemInput[]) => {
  const rows = items.map((i) => ({ ...i, invoice_id: invoiceId }));
  const { data: inserted, error } = await supabase
    .from('invoice_line_items')
    .insert(rows)
    .select();

  if (error) throw error;

  // Recalculate total_amount on invoice
  await recalculateInvoiceTotal(invoiceId);

  return inserted;
};

export const addPayment = async (invoiceId: string, input: PaymentInput) => {
  // Insert payment
  const { data: payment, error } = await supabase
    .from('invoice_payments')
    .insert({ ...input, invoice_id: invoiceId })
    .select()
    .single();

  if (error) throw error;

  // Check new balance due via invoice_summary
  const { data: summary } = await supabase
    .from('invoice_summary')
    .select('*')
    .eq('id', invoiceId)
    .single();

  if (summary) {
    const newStatus = Number(summary.balance_due) <= 0 ? 'paid' : 'partially_paid';
    await supabase.from('invoices').update({ status: newStatus }).eq('id', invoiceId);
  }

  return payment;
};

export const issueInvoice = async (invoiceId: string) => {
  await recalculateInvoiceTotal(invoiceId);
  const { data, error } = await supabase
    .from('invoices')
    .update({ status: 'issued' })
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const cancelInvoice = async (invoiceId: string) => {
  const { data, error } = await supabase
    .from('invoices')
    .update({ status: 'cancelled' })
    .eq('id', invoiceId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

async function recalculateInvoiceTotal(invoiceId: string) {
  const { data: inv } = await supabase.from('invoices').select('discount_amount, tax_amount').eq('id', invoiceId).single();
  const { data: items } = await supabase.from('invoice_line_items').select('line_total').eq('invoice_id', invoiceId);

  const subtotal = (items || []).reduce((sum, it) => sum + Number(it.line_total), 0);
  const total = subtotal - Number(inv?.discount_amount || 0) + Number(inv?.tax_amount || 0);

  await supabase.from('invoices').update({ total_amount: total }).eq('id', invoiceId);
}
