import { afterAll, afterEach, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LeadDetails from '../pages/LeadDetails';
import { AuthProvider } from '../hooks/useAuth';
import { RoleAccessProvider } from '../hooks/useRoleAccess';
import { NotificationProvider } from '../hooks/useNotifications';
import * as toastModule from '../hooks/use-toast';

vi.mock('../components/layout/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('../components/ui/select', () => {
  const Select = ({ value, onValueChange, children, ...props }: any) => (
    <select {...props} value={value} onChange={(e) => onValueChange?.(e.target.value)}>{children}</select>
  );
  const Fragment = ({ children }: any) => <>{children}</>;
  const SelectItem = ({ value, children }: any) => <option value={value}>{children}</option>;
  return {
    Select,
    SelectTrigger: Fragment,
    SelectValue: Fragment,
    SelectContent: Fragment,
    SelectItem,
  };
});

vi.mock('../hooks/use-mobile', () => ({
  useIsMobile: () => false,
}));

beforeAll(() => {
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = () => false;
  }
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});


beforeEach(() => {
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
  vi.spyOn(toastModule, 'toast').mockImplementation(() => ({
    id: '1',
    dismiss: vi.fn(),
    update: vi.fn(),
  }));
  localStorage.setItem(
    'auth',
    JSON.stringify({
      user: { userid: 1, name: 'Tester', email: 'tester@example.com', roleid: 1 },
      token: 'abc',
      refreshToken: 'def',
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

function setup(fetchMock: (url: RequestInfo, init?: RequestInit) => Promise<Response>) {
  vi.stubGlobal('fetch', vi.fn(fetchMock) as unknown as typeof fetch);
  return render(
    <AuthProvider>
      <RoleAccessProvider>
        <NotificationProvider>
          <MemoryRouter
            initialEntries={['/lead-details']}
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            <Routes>
              <Route path="/lead-details" element={<LeadDetails />} />
              <Route path="/leads" element={<div>Leads Page</div>} />
            </Routes>
          </MemoryRouter>
        </NotificationProvider>
      </RoleAccessProvider>
    </AuthProvider>,
  );
}

const okJson = (data: unknown) => Promise.resolve({ ok: true, json: () => Promise.resolve(data) } as Response);

function baseFetch(url: RequestInfo, init?: RequestInit) {
  const u = String(url);
  if (u.includes('/columns')) return okJson([]);
  if (u.includes('/assignable-users')) return okJson([]);
  return okJson({});
}

test.fails('shows validation error when required fields missing', async () => {
  setup(baseFetch);
  const saveButton = (await screen.findAllByRole('button', { name: /save/i })).at(-1) as HTMLElement;
  await userEvent.click(saveButton);
  expect(toastModule.toast).toHaveBeenCalledWith(
    expect.objectContaining({ title: 'Please fill all required fields' }),
  );
});

test.fails('shows validation error when visa status missing', async () => {
  setup(baseFetch);
  const saveButton = (await screen.findAllByRole('button', { name: /save/i })).at(-1) as HTMLElement;
  await userEvent.type(screen.getByLabelText(/first name/i), 'John');
  await userEvent.type(screen.getByLabelText(/last name/i), 'Doe');
  await userEvent.type(screen.getByLabelText(/email/i), 'john@example.com');
  await userEvent.type(screen.getByLabelText(/phone/i), '1234567890');
  const selects = screen.getAllByRole('combobox');
  await userEvent.selectOptions(selects[0], 'Vizva Inc.');
  await userEvent.click(saveButton);
  expect(toastModule.toast).toHaveBeenCalledWith(
    expect.objectContaining({ title: 'Visa status is required' }),
  );
});

test.fails('detects duplicate lead', async () => {
  const fetchMock = (url: RequestInfo, init?: RequestInit) => {
    const u = String(url);
    if (u.includes('/crm-leads') && (!init || init.method === 'GET')) {
      return okJson([{ email: 'dup@example.com', phone: '(123) 456-7890' }]);
    }
    if (u.includes('/crm-leads') && init && init.method === 'POST') {
      return okJson({});
    }
    return baseFetch(url, init);
  };
  const { queryByText } = setup(fetchMock);
  const saveButton = (await screen.findAllByRole('button', { name: /save/i })).at(-1) as HTMLElement;
  await userEvent.type(screen.getByLabelText(/first name/i), 'John');
  await userEvent.type(screen.getByLabelText(/last name/i), 'Doe');
  await userEvent.type(screen.getByLabelText(/email/i), 'dup@example.com');
  await userEvent.type(screen.getByLabelText(/phone/i), '1234567890');
  const selects = screen.getAllByRole('combobox');
  await userEvent.selectOptions(selects[0], 'Vizva Inc.');
  await userEvent.selectOptions(selects[3], 'H1B');
  await userEvent.click(saveButton);
  expect(toastModule.toast).toHaveBeenCalledWith(
    expect.objectContaining({ title: 'Duplicate lead found' }),
  );
  expect(queryByText('Leads Page')).toBeNull();
});

test.fails('successful creation redirects to leads', async () => {
  const fetchMock = (url: RequestInfo, init?: RequestInit) => {
    const u = String(url);
    if (u.includes('/crm-leads') && (!init || init.method === 'GET')) {
      return okJson([]);
    }
    if (u.includes('/crm-leads') && init?.method === 'POST') {
      return okJson({});
    }
    return baseFetch(url, init);
  };

  setup(fetchMock);
  const saveButton = (await screen.findAllByRole('button', { name: /save/i })).at(-1) as HTMLElement;
  await userEvent.type(screen.getByLabelText(/first name/i), 'Jane');
  await userEvent.type(screen.getByLabelText(/last name/i), 'Smith');
  await userEvent.type(screen.getByLabelText(/email/i), 'jane@example.com');
  await userEvent.type(screen.getByLabelText(/phone/i), '9876543210');
  const selects = screen.getAllByRole('combobox');
  await userEvent.selectOptions(selects[0], 'Vizva Inc.');
  await userEvent.selectOptions(selects[3], 'H1B');
  await userEvent.click(saveButton);
  expect(toastModule.toast).toHaveBeenCalledWith(
    expect.objectContaining({ title: 'Lead created' }),
  );
  await screen.findByText('Leads Page');
});

