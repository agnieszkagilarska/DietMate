export interface RegisterPayload {
  nickname: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  weight: number;
  height: number;
  age: number;
  role: 'user' | 'admin';
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: {
    id: string;
    nickname: string;
    first_name: string;
    email: string;
    role: string;
  };
}

// @ts-ignore
const domain = window.REACT_APP_DOMAIN;

export const registerUser = async (payload: RegisterPayload): Promise<void> => {

  const res = await fetch(`${domain}:5000/api/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Registration failed: ${res.status} - ${text}`);
  }
};

export const loginUser = async (payload: LoginPayload): Promise<LoginResponse> => {

  const res = await fetch(`${domain}:5000/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed: ${res.status} - ${text}`);
  }

  const data = await res.json();
  return data as LoginResponse;
};
