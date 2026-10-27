import { Router } from 'express';
import { validate } from '../../middleware/validate';
import {
  createConsultationSchema,
  updateConsultationSchema,
  addPrescriptionItemsSchema,
  updateDispensedSchema,
  referralInputSchema,
} from './clinical.schema';
import * as clinicalController from './clinical.controller';

const router = Router();

router.post('/', validate(createConsultationSchema), clinicalController.createConsultation);
router.get('/', clinicalController.listConsultations);
router.get('/appointment/:appointmentId', clinicalController.getConsultationByAppointment);
router.get('/:id', clinicalController.getConsultationById);
router.patch('/:id', validate(updateConsultationSchema), clinicalController.updateConsultation);

// Embedded sub-document operations
router.post('/:id/prescriptions', validate(addPrescriptionItemsSchema), clinicalController.addPrescriptions);
router.patch('/prescriptions/:itemId/dispensed', validate(updateDispensedSchema), clinicalController.updatePrescriptionDispensed);
router.post('/:id/referrals', validate(referralInputSchema), clinicalController.addReferral);

export default router;
