// api/cart.ts
// @ts-ignore
const domain = window.REACT_APP_DOMAIN;

/**
 * Dodaje dietę do koszyka z TTL ustawionym na 24h (86400 sekund).
 */
export const addToCartApi = async (dietName: string) => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No token available! Please start a session.');
  }

  const ttlSeconds = 86400; // 24 godziny

  const res = await fetch(`${domain}:5000/api/redis/add?set_name=cart`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      value: dietName,
      ttl: ttlSeconds, // <<< Ustawienie TTL na 24h
    }),
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Add to cart failed: ${res.status} - ${text}`);
  }

  return res.json();
};

const getToken = () => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No token found, please initialize session.');
  return token;
};

export const incrementCartItem = async (dietName: string, increment: number) => {
  const token = getToken();
  const res = await fetch(`${domain}:5000/api/redis/increment?set_name=cart`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      value: dietName,
      increment: increment, // +1 or -1
    }),
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Increment failed: ${res.status} - ${text}`);
  }

  return res.json();
};

export const deleteCartItem = async (dietName: string, count: number) => {
  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No token available! Please start a session.');
  }

  const res = await fetch(`${domain}:5000/api/redis/delete?set_name=cart`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      value: dietName,
      count: count, // <<< podajesz dokładnie ile sztuk ma usunąć
    }),
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Delete failed: ${res.status} - ${text}`);
  }

  return res.json();
};

export const getDietCountInCart = async (dietName: string): Promise<number> => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No token available!');

  const res = await fetch(`${domain}:5000/api/redis/list?set_name=cart`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch cart items: ${res.status} - ${text}`);
  }

  const data = await res.json();
  const item = data.values.find((entry: any) => entry.key === dietName);

  return item ? item.count : 0;
};

export const getCartItemsFromRedis = async () => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No token available!');

  const res = await fetch(`${domain}:5000/api/redis/search?set_name=cart`, {  // <<< ZAMIANA NA list!
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch cart items: ${res.status} - ${text}`);
  }

  return res.json();
};