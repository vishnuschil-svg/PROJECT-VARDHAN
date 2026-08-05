import { Router, Request, Response } from 'express';
import { register, login } from './auth.service';

const authRouter = Router();

authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, fullName, tenantSlug, tenantName } = req.body;
    if (!email || !password || !fullName || !tenantSlug || !tenantName) {
      res.status(400).json({ error: 'email, password, fullName, tenantSlug and tenantName are required' });
      return;
    }
    const result = await register({ email, password, fullName, tenantSlug, tenantName });
    res.status(201).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    res.status(400).json({ error: message });
  }
});

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'email and password are required' });
      return;
    }
    const result = await login({ email, password });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Login failed';
    res.status(401).json({ error: message });
  }
});

export default authRouter;