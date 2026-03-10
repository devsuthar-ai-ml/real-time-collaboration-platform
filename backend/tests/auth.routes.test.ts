import request from 'supertest';
import { app } from '../src/app';
import { authService } from '../src/services/auth.service';

jest.mock('../src/services/auth.service', () => ({
  authService: {
    register: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn()
  }
}));

const mockedAuthService = authService as jest.Mocked<typeof authService>;

describe('Auth Routes', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should register a user', async () => {
    mockedAuthService.register.mockResolvedValue({
      token: 'fake-token',
      user: {
        id: 'u1',
        name: 'John Doe',
        email: 'john@example.com',
        createdAt: new Date()
      }
    });

    const response = await request(app).post('/api/auth/register').send({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'Password123'
    });

    expect(response.status).toBe(201);
    expect(response.body.token).toBe('fake-token');
    expect(mockedAuthService.register).toHaveBeenCalledTimes(1);
  });

  it('should reject invalid login payload', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'invalid-email',
      password: 'short'
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation failed');
  });
});
