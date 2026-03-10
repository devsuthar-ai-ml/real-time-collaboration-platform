import { prisma } from '../lib/prisma';
import { comparePassword, hashPassword } from '../utils/password';
import { AppError } from '../utils/httpError';
import { signToken } from '../utils/jwt';

interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

class AuthService {
  async register(input: RegisterInput) {
    const email = input.email.toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      throw new AppError('Email is already registered', 409);
    }

    const passwordHash = await hashPassword(input.password);
    const user = await prisma.user.create({
      data: {
        name: input.name.trim(),
        email,
        passwordHash
      }
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name
    });

    return {
      token,
      user: this.toPublicUser(user)
    };
  }

  async login(input: LoginInput) {
    const email = input.email.toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isPasswordValid = await comparePassword(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    const token = signToken({
      userId: user.id,
      email: user.email,
      name: user.name
    });

    return {
      token,
      user: this.toPublicUser(user)
    };
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return this.toPublicUser(user);
  }

  async logout(): Promise<{ success: boolean }> {
    return { success: true };
  }

  private toPublicUser(user: { id: string; name: string; email: string; createdAt: Date }) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt
    };
  }
}

export const authService = new AuthService();
