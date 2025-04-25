// src/api/favorites.ts
// @ts-ignore
const domain = window.REACT_APP_DOMAIN;

const getToken = () => {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('No token available!');
  return token;
};

export const getFavoritesFromRedis = async (): Promise<string[]> => {
  const token = getToken();

  const res = await fetch(`${domain}:5000/api/redis/search?set_name=liked_products`, {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${token}` },
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch favorites: ${res.status} - ${text}`);
  }

  const data = await res.json();

  // POPRAWKA TUTAJ:
  return data.items.map((item: any) => item.value); 
};

export const addFavoriteToRedis = async (dietName: string) => {
  const token = getToken();

  await fetch(`${domain}:5000/api/redis/add?set_name=liked_products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ value: dietName }),
    credentials: 'include',
  });
};

export const removeFavoriteFromRedis = async (dietName: string) => {
  const token = getToken();

  await fetch(`${domain}:5000/api/redis/delete?set_name=liked_products`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ value: dietName }),
    credentials: 'include',
  });
};
