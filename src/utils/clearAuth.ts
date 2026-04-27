/**
 * Limpia todos los datos de autenticación del localStorage
 * Útil para debugging y resetear el estado de autenticación
 */
export const clearAuthData = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
};

/**
 * Verifica si hay datos de autenticación en localStorage
 */
export const hasAuthData = (): boolean => {
  const token = localStorage.getItem("accessToken");
  const user = localStorage.getItem("user");
  return !!(token && user);
};

/**
 * Obtiene información del usuario actual del localStorage
 */
export const getCurrentUser = () => {
  const userData = localStorage.getItem("user");
  if (userData) {
    try {
      return JSON.parse(userData);
    } catch {
      return null;
    }
  }
  return null;
};
