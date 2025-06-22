import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./useAuth";

interface RoleAccessContextType {
  roleAccess: Record<string, boolean>;
  refreshRoleAccess: () => Promise<void>;
}

const RoleAccessContext = createContext<RoleAccessContextType | undefined>(undefined);

export function RoleAccessProvider({ children }: { children: React.ReactNode }) {
  const { fetchWithAuth, user } = useAuth();
  const [roleAccess, setRoleAccess] = useState<Record<string, boolean>>({});
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const loadAccess = async () => {
    if (!user) {
      setRoleAccess({});
      return;
    }
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/role-access`);
      if (res.ok) {
        const data = await res.json();
        const roleMap: Record<number, string> = {
          1: 'superadmin',
          2: 'admin',
          3: 'manager',
          4: 'lead',
          5: 'agent'
        };
        const roleName = roleMap[user.roleid];
        const access: Record<string, boolean> = {};
        for (const [componentId, roles] of Object.entries(data)) {
          if (typeof roles === 'object' && roleName in (roles as Record<string, boolean>)) {
            access[componentId] = (roles as Record<string, boolean>)[roleName];
          }
        }
        setRoleAccess(access);
      }
    } catch {
      // Failed to load role access
    }
  };

  useEffect(() => {
    loadAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <RoleAccessContext.Provider value={{ roleAccess, refreshRoleAccess: loadAccess }}>
      {children}
    </RoleAccessContext.Provider>
  );
}

export function useRoleAccess() {
  const ctx = useContext(RoleAccessContext);
  if (!ctx) throw new Error("useRoleAccess must be used within RoleAccessProvider");
  return ctx;
}
