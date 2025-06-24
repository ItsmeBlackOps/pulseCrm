import { beforeAll, afterAll, afterEach, expect, test, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import RoleAccess from '../pages/RoleAccess';
import { AuthProvider } from '../hooks/useAuth';
import '@testing-library/jest-dom/vitest';

vi.mock('../components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
vi.mock('../hooks/use-mobile', () => ({ useIsMobile: () => false }));

const okJson = (data: unknown) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve(data) } as Response);

beforeAll(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation(() => ({
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia,
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  cleanup();
  localStorage.clear();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

function renderRoleAccess() {
  localStorage.setItem(
    'auth',
    JSON.stringify({
      user: { userid: 1, name: 'Tester', email: 'tester@example.com', roleid: 1 },
      token: 'abc',
      refreshToken: 'def',
    }),
  );
  const fetchMock = vi.fn((url: RequestInfo) => {
    const u = String(url);
    if (u.includes('/roles')) {
      return okJson([
        { name: 'Super Admin' },
        { name: 'Admin' },
        { name: 'Manager' },
        { name: 'Sales Lead' },
        { name: 'Sales Agent' },
      ]);
    }
    if (u.includes('/role-access')) return okJson({});
    return okJson({});
  });
  vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);
  return render(
    <AuthProvider>
      <MemoryRouter>
        <RoleAccess />
      </MemoryRouter>
    </AuthProvider>,
  );
}

test('renders headers for all roles returned from API', async () => {
  renderRoleAccess();
  const roles = ['Super Admin', 'Admin', 'Manager', 'Sales Lead', 'Sales Agent'];
  for (const role of roles) {
    expect(await screen.findByText(role)).toBeInTheDocument();
  }
});
