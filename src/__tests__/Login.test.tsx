import { afterAll, beforeAll, beforeEach, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import SignIn from '../pages/auth/SignIn';
import { AuthProvider } from '../hooks/useAuth';

beforeAll(() => {
  vi.stubGlobal(
    'matchMedia',
    vi
      .fn()
      .mockImplementation(() => ({
        matches: false,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })) as unknown as typeof window.matchMedia,
  );
});

beforeEach(() => {
  localStorage.clear();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

test('successful login stores user info and redirects', async () => {
  const user = { userid: 1, name: 'Test', email: 'test@example.com', roleid: 2 };
  const fetchMock = vi.fn().mockImplementation((url: RequestInfo) => {
    if (String(url).includes('/login')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({ user, token: 'abc', refreshToken: 'def' }),
      });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
  vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

  render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/auth/signin"]}>
        <Routes>
          <Route path="/auth/signin" element={<SignIn />} />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );

  await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'password');
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

  await screen.findByText('Home');

  expect(localStorage.getItem('auth')).not.toBeNull();
  expect(JSON.parse(localStorage.getItem('auth') || '{}')).toEqual({
    user,
    token: 'abc',
    refreshToken: 'def',
  });
});

test('invalid credentials display error message', async () => {
  const fetchMock = vi.fn().mockImplementation((url: RequestInfo) => {
    if (String(url).includes('/login')) {
      return Promise.resolve({ ok: false });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
  vi.stubGlobal('fetch', fetchMock as unknown as typeof fetch);

  render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/auth/signin"]}>
        <Routes>
          <Route path="/auth/signin" element={<SignIn />} />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );

  await userEvent.type(screen.getByLabelText(/email/i), 'invalid@example.com');
  await userEvent.type(screen.getByLabelText(/password/i), 'wrong');
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

  expect(await screen.findByText(/Invalid email or password/i)).toBeDefined();
});
