import { Router } from 'express';
import { login, logout, me, register } from '../controllers/auth.controller';
import { authenticateJWT } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { loginSchema, registerSchema } from '../models/auth.model';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/logout', authenticateJWT, logout);
router.get('/me', authenticateJWT, me);

export default router;
