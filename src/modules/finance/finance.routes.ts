import { Router } from 'express';
import { validate } from '../../middleware/validate';
import {
  createInvoiceSchema,
  addLineItemsSchema,
  paymentInputSchema,
} from './finance.schema';
import * as financeController from './finance.controller';

const router = Router();

router.post('/', validate(createInvoiceSchema), financeController.createInvoice);
router.get('/', financeController.listInvoices);
router.get('/summary/patient/:patientId', financeController.getPatientInvoiceSummaries);
router.get('/:id', financeController.getInvoiceById);
router.post('/:id/items', validate(addLineItemsSchema), financeController.addLineItems);
router.post('/:id/payments', validate(paymentInputSchema), financeController.addPayment);
router.patch('/:id/issue', financeController.issueInvoice);
router.patch('/:id/cancel', financeController.cancelInvoice);

export default router;
