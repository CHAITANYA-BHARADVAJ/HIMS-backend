import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import * as pharmacyService from './pharmacy.service';

export const listDrugs = asyncHandler(async (req: Request, res: Response) => {
  const search = req.query.search as string | undefined;
  const category = req.query.category as string | undefined;
  const drugs = await pharmacyService.listDrugs({ search, category });
  res.json({ success: true, data: drugs });
});

export const getDrugById = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const drug = await pharmacyService.getDrugById(id);
  res.json({ success: true, data: drug });
});

export const createDrug = asyncHandler(async (req: Request, res: Response) => {
  const drug = await pharmacyService.createDrug(req.body);
  res.status(201).json({ success: true, data: drug });
});

export const updateDrug = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const drug = await pharmacyService.updateDrug(id, req.body);
  res.json({ success: true, data: drug });
});

export const addStock = asyncHandler(async (req: Request, res: Response) => {
  const stock = await pharmacyService.addStock(req.body);
  res.status(201).json({ success: true, data: stock });
});

export const getLowStockAlerts = asyncHandler(async (_req: Request, res: Response) => {
  const alerts = await pharmacyService.getLowStockAlerts();
  res.json({ success: true, data: alerts });
});

export const dispenseDrugs = asyncHandler(async (req: Request, res: Response) => {
  const order = await pharmacyService.dispenseDrugs(req.body);
  res.status(201).json({ success: true, data: order });
});

export const getDispenseOrderById = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const order = await pharmacyService.getDispenseOrderById(id);
  res.json({ success: true, data: order });
});

export const listDispenseOrders = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.query.patientId as string | undefined;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;

  const result = await pharmacyService.listDispenseOrders({ patient_id: patientId, page, limit });
  res.json({ success: true, data: result.orders, pagination: result.pagination });
});
