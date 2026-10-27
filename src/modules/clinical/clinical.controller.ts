import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import * as clinicalService from './clinical.service';

export const createConsultation = asyncHandler(async (req: Request, res: Response) => {
  const consultation = await clinicalService.createConsultation(req.body);
  res.status(201).json({ success: true, data: consultation });
});

export const listConsultations = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.query.patientId as string | undefined;
  const doctorId = req.query.doctorId as string | undefined;
  const status = req.query.status as string | undefined;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;

  const result = await clinicalService.listConsultations({
    patient_id: patientId,
    doctor_id: doctorId,
    status,
    page,
    limit,
  });

  res.json({ success: true, data: result.consultations, pagination: result.pagination });
});

export const getConsultationById = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const consultation = await clinicalService.getConsultationById(id);
  res.json({ success: true, data: consultation });
});

export const getConsultationByAppointment = asyncHandler(async (req: Request, res: Response) => {
  const appointmentId = req.params.appointmentId as string;
  const consultation = await clinicalService.getConsultationByAppointment(appointmentId);
  res.json({ success: true, data: consultation });
});

export const updateConsultation = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const consultation = await clinicalService.updateConsultation(id, req.body);
  res.json({ success: true, data: consultation });
});

export const addPrescriptions = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const prescriptions = await clinicalService.addPrescriptions(id, req.body.items);
  res.status(201).json({ success: true, data: prescriptions });
});

export const updatePrescriptionDispensed = asyncHandler(async (req: Request, res: Response) => {
  const itemId = req.params.itemId as string;
  const item = await clinicalService.updatePrescriptionDispensed(itemId, req.body.dispensed);
  res.json({ success: true, data: item });
});

export const addReferral = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const referral = await clinicalService.addReferral(id, req.body);
  res.status(201).json({ success: true, data: referral });
});
