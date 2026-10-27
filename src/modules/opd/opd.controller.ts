import { Request, Response } from 'express';
import { asyncHandler } from '../../middleware/asyncHandler';
import * as opdService from './opd.service';

// Departments
export const listDepartments = asyncHandler(async (_req: Request, res: Response) => {
  const departments = await opdService.listDepartments();
  res.json({ success: true, data: departments });
});

export const createDepartment = asyncHandler(async (req: Request, res: Response) => {
  const department = await opdService.createDepartment(req.body);
  res.status(201).json({ success: true, data: department });
});

// Doctors
export const listDoctors = asyncHandler(async (req: Request, res: Response) => {
  const departmentId = req.query.departmentId as string | undefined;
  const isAvailable = req.query.available !== undefined ? req.query.available === 'true' : undefined;
  const doctors = await opdService.listDoctors({ department_id: departmentId, is_available: isAvailable });
  res.json({ success: true, data: doctors });
});

export const getDoctorById = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const doctor = await opdService.getDoctorById(id);
  res.json({ success: true, data: doctor });
});

export const createDoctor = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await opdService.createDoctor(req.body);
  res.status(201).json({ success: true, data: doctor });
});

export const updateDoctor = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const doctor = await opdService.updateDoctor(id, req.body);
  res.json({ success: true, data: doctor });
});

// Appointments
export const createAppointment = asyncHandler(async (req: Request, res: Response) => {
  const appointment = await opdService.createAppointment(req.body);
  res.status(201).json({ success: true, data: appointment });
});

export const listAppointments = asyncHandler(async (req: Request, res: Response) => {
  const patientId = req.query.patientId as string | undefined;
  const doctorId = req.query.doctorId as string | undefined;
  const departmentId = req.query.departmentId as string | undefined;
  const date = req.query.date as string | undefined;
  const status = req.query.status as string | undefined;
  const page = parseInt(req.query.page as string, 10) || 1;
  const limit = parseInt(req.query.limit as string, 10) || 20;

  const result = await opdService.listAppointments({
    patient_id: patientId,
    doctor_id: doctorId,
    department_id: departmentId,
    date,
    status,
    page,
    limit,
  });

  res.json({ success: true, data: result.appointments, pagination: result.pagination });
});

export const getAppointmentById = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const appointment = await opdService.getAppointmentById(id);
  res.json({ success: true, data: appointment });
});

export const updateAppointmentStatus = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const appointment = await opdService.updateAppointmentStatus(id, req.body);
  res.json({ success: true, data: appointment });
});

export const getDepartmentQueue = asyncHandler(async (req: Request, res: Response) => {
  const departmentId = req.params.departmentId as string;
  const date = req.params.date as string;
  const queue = await opdService.getDepartmentQueue(departmentId, date);
  res.json({ success: true, data: queue });
});
