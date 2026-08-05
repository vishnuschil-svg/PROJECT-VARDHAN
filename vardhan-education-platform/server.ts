import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import tenantRouter from './platform-core/tenancy/tenant.routes';
import authRouter from './platform-core/auth/auth.routes';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get('/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    platform: 'VARDHAN EDUCATION PLATFORM (Ed-OS)',
    version: '1.0.0',
    coreEngines: ['Auth', 'Tenancy', 'Single Identity', 'Hostel/PG SaaS']
  });
});

app.use(express.static('public'));

app.use('/api/v1/tenant', tenantRouter);
app.use('/api/v1/auth', authRouter);

app.listen(PORT, () => {
  console.log(`🚀 VARDHAN Ed-OS Engine running on http://localhost:${PORT}`);
});