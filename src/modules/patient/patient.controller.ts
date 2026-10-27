import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import * as patientService from './patient.service';

export const createPatient = asyncHandler(async (req: Request, res: Response) => {
  const patient = await patientService.createPatient(req.body);
  res.status(201).json({ success: true, data: patient });
});

export const listPatients = asyncHandler(async (req: Request, res: Response) => {
  const search = req.query.search as string | undefined;
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

  const result = await patientService.listPatients({ search, page, limit });
  res.json({ success: true, data: result.patients, pagination: result.pagination });
});

export const getPatientById = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const patient = await patientService.getPatientById(id);
  res.json({ success: true, data: patient });
});

export const getPatientByUhid = asyncHandler(async (req: Request, res: Response) => {
  const uhid = req.params.uhid as string;
  const patient = await patientService.getPatientByUhid(uhid);
  res.json({ success: true, data: patient });
});

export const updatePatient = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const patient = await patientService.updatePatient(id, req.body);
  res.json({ success: true, data: patient });
});

export const deletePatient = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const patient = await patientService.softDeletePatient(id);
  res.json({ success: true, message: 'Patient deleted successfully', data: patient });
});
