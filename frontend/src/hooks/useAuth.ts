import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  return {
    token,
    user,
    isAuthenticated: Boolean(token),
    setAuth,
    clearAuth
  };
};
