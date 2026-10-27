import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import * as financeService from './finance.service';

export const createInvoice = asyncHandler(async (req: Request, res: Response) => {
  const invoice = await financeService.createInvoice(req.body);
  res.status(201).json({ success: true, data: invoice });
});

export const listInvoices = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.query.patientId as string | undefined;
  const status = req.query.status as string | undefined;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;

  const result = await financeService.listInvoices({ patient_id: patientId, status, page, limit });
  res.json({ success: true, data: result.invoices, pagination: result.pagination });
});

export const getInvoiceById = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const invoice = await financeService.getInvoiceById(id);
  res.json({ success: true, data: invoice });
});

export const getPatientInvoiceSummaries = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.params.patientId as string;
  const summaries = await financeService.getPatientInvoiceSummaries(patientId);
  res.json({ success: true, data: summaries });
});

export const addLineItems = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const items = await financeService.addLineItems(id, req.body.items);
  res.status(201).json({ success: true, data: items });
});

export const addPayment = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const payment = await financeService.addPayment(id, req.body);
  res.status(201).json({ success: true, data: payment });
});

export const issueInvoice = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const invoice = await financeService.issueInvoice(id);
  res.json({ success: true, data: invoice });
});

export const cancelInvoice = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const invoice = await financeService.cancelInvoice(id);
  res.json({ success: true, data: invoice });
});
