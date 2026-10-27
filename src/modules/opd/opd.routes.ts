import { Router } from 'express';
import { validate } from '../../middleware/validate';
import {
  createDepartmentSchema,
  createDoctorSchema,
  updateDoctorSchema,
  createAppointmentSchema,
  updateAppointmentStatusSchema,
} from './opd.schema';
import * as opdController from './opd.controller';

const router = Router();

// Departments
router.get('/departments', opdController.listDepartments);
router.post('/departments', validate(createDepartmentSchema), opdController.createDepartment);

// Doctors
router.get('/doctors', opdController.listDoctors);
router.get('/doctors/:id', opdController.getDoctorById);
router.post('/doctors', validate(createDoctorSchema), opdController.createDoctor);
router.patch('/doctors/:id', validate(updateDoctorSchema), opdController.updateDoctor);

// Appointments
router.post('/appointments', validate(createAppointmentSchema), opdController.createAppointment);
router.get('/appointments', opdController.listAppointments);
router.get('/appointments/queue/:departmentId/:date', opdController.getDepartmentQueue);
router.get('/appointments/:id', opdController.getAppointmentById);
router.patch('/appointments/:id/status', validate(updateAppointmentStatusSchema), opdController.updateAppointmentStatus);

export default router;
