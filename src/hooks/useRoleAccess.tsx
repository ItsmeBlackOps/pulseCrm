/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./useAuth";

interface RoleAccessContextType {
  /** e.g. { dashboard: true, contacts: false, … } */
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
      if (!res.ok) {
        console.error("Failed to fetch role-access", res.status);
        return;
      }

      // payload is { component: { "1": true, "2": true, … }, … }
      const data: Record<string, Record<string, boolean>> = await res.json();

      // our current user's roleid is a number; JSON keys are strings
      const myRoleKey = String(user.roleid);

      // build a flat map: component → allowed?  
      const access: Record<string, boolean> = {};
      for (const [component, rolesMap] of Object.entries(data)) {
        access[component] = !!rolesMap[myRoleKey];
      }

      setRoleAccess(access);
    } catch (err) {
      console.error("Error loading role-access", err);
    }
  };

  useEffect(() => {
    loadAccess();
    // we only really care if `user` changes
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
