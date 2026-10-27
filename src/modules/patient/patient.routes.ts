import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { createPatientSchema, updatePatientSchema } from './patient.schema';
import * as patientController from './patient.controller';

const router = Router();

router.post('/', validate(createPatientSchema), patientController.createPatient);
router.get('/', patientController.listPatients);
router.get('/:id', patientController.getPatientById);
router.get('/uhid/:uhid', patientController.getPatientByUhid);
router.patch('/:id', validate(updatePatientSchema), patientController.updatePatient);
router.delete('/:id', patientController.deletePatient);

export default router;
