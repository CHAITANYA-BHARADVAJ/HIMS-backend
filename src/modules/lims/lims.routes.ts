import { Router } from 'express';
import { validate } from '../../middleware/validate';
import {
  createLabTestSchema,
  createLabOrderSchema,
  updateLabOrderStatusSchema,
  updateLabItemResultSchema,
  attachReportSchema,
} from './lims.schema';
import * as limsController from './lims.controller';

const router = Router();

// Test Catalog
router.get('/tests', limsController.listLabTests);
router.post('/tests', validate(createLabTestSchema), limsController.createLabTest);

// Orders
router.post('/orders', validate(createLabOrderSchema), limsController.createLabOrder);
router.get('/orders', limsController.listLabOrders);
router.get('/orders/:id', limsController.getLabOrderById);
router.patch('/orders/:id/status', validate(updateLabOrderStatusSchema), limsController.updateLabOrderStatus);

// Item Results
router.patch('/orders/items/:itemId/result', validate(updateLabItemResultSchema), limsController.updateLabItemResult);

// Reports
router.post('/orders/:id/report', validate(attachReportSchema), limsController.attachReport);
router.get('/orders/:id/report/download', limsController.getReportDownloadUrl);

export default router;
