import { Router } from 'express';
import { validate } from '../../middleware/validate';
import {
  createDrugSchema,
  updateDrugSchema,
  addStockSchema,
  dispenseDrugsSchema,
} from './pharmacy.schema';
import * as pharmacyController from './pharmacy.controller';

const router = Router();

// Drugs
router.get('/drugs', pharmacyController.listDrugs);
router.get('/drugs/alerts/low-stock', pharmacyController.getLowStockAlerts);
router.get('/drugs/:id', pharmacyController.getDrugById);
router.post('/drugs', validate(createDrugSchema), pharmacyController.createDrug);
router.patch('/drugs/:id', validate(updateDrugSchema), pharmacyController.updateDrug);

// Stock
router.post('/stock', validate(addStockSchema), pharmacyController.addStock);

// Dispense
router.post('/dispense', validate(dispenseDrugsSchema), pharmacyController.dispenseDrugs);
router.get('/dispense', pharmacyController.listDispenseOrders);
router.get('/dispense/:id', pharmacyController.getDispenseOrderById);

export default router;
