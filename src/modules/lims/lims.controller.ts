import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import * as limsService from './lims.service';

export const listLabTests = asyncHandler(async (_req: Request, res: Response) => {
  const tests = await limsService.listLabTests();
  res.json({ success: true, data: tests });
});

export const createLabTest = asyncHandler(async (req: Request, res: Response) => {
  const test = await limsService.createLabTest(req.body);
  res.status(201).json({ success: true, data: test });
});

export const createLabOrder = asyncHandler(async (req: Request, res: Response) => {
  const order = await limsService.createLabOrder(req.body);
  res.status(201).json({ success: true, data: order });
});

export const listLabOrders = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.query.patientId as string | undefined;
  const status = req.query.status as string | undefined;
  const priority = req.query.priority as string | undefined;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;

  const result = await limsService.listLabOrders({
    patient_id: patientId,
    status,
    priority,
    page,
    limit,
  });

  res.json({ success: true, data: result.orders, pagination: result.pagination });
});

export const getLabOrderById = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const order = await limsService.getLabOrderById(id);
  res.json({ success: true, data: order });
});

export const updateLabOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const order = await limsService.updateLabOrderStatus(id, req.body);
  res.json({ success: true, data: order });
});

export const updateLabItemResult = asyncHandler(async (req: Request, res: Response) => {
  const itemId = req.params.itemId as string;
  const item = await limsService.updateLabItemResult(itemId, req.body);
  res.json({ success: true, data: item });
});

export const attachReport = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const order = await limsService.attachReport(id, req.body);
  res.json({ success: true, data: order });
});

export const getReportDownloadUrl = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const result = await limsService.getReportDownloadUrl(id);
  res.json({ success: true, data: result });
});
