export interface Department {
  id: string;
  name: string;
  slug: string;
  color: string | null;
  icon: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { users: number };
}

// Versión liviana del Department (lo que devuelve `User.department` en
// listados y en /auth/me).
export interface DepartmentMini {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
}
