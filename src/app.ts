import express from 'express';
import cors from 'cors';
import { errorHandler } from './middleware/errorHandler';

// Module routes
import patientRoutes from './modules/patient/patient.routes';
import opdRoutes from './modules/opd/opd.routes';
import clinicalRoutes from './modules/clinical/clinical.routes';
import limsRoutes from './modules/lims/lims.routes';
import pharmacyRoutes from './modules/pharmacy/pharmacy.routes';
import financeRoutes from './modules/finance/finance.routes';

export const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Normalize repeated slashes (e.g. //api/patients -> /api/patients)
app.use((req, _res, next) => {
  if (req.url.includes('//')) {
    req.url = req.url.replace(/\/+/g, '/');
  }
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'HIMS Backend API',
  });
});

// API Overview
app.get('/api', (_req, res) => {
  res.json({
    message: 'HIMS Backend REST API',
    version: '1.0.0',
    modules: {
      patient: '/api/patients',
      opd: '/api/opd (departments, doctors, appointments, queues)',
      clinical: '/api/clinical (consultations, prescriptions, referrals)',
      lims: '/api/lims (lab tests catalog, orders, items, reports)',
      pharmacy: '/api/pharmacy (drugs, stock, atomic dispense orders)',
      finance: '/api/finance (invoices, line items, payments, bill summaries)',
    },
  });
});

// Register module routes
app.use('/api/patients', patientRoutes);
app.use('/api/opd', opdRoutes);
app.use('/api/clinical', clinicalRoutes);
app.use('/api/lims', limsRoutes);
app.use('/api/pharmacy', pharmacyRoutes);
app.use('/api/finance', financeRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Centralized error handler
app.use(errorHandler);
