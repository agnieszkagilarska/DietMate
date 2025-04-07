import { API_BASE_URL } from './config';

export interface Diet {
  _id?: string;
  diet_name: string;
  description: string;
  rating: number;
  meals: string[];
  imageUrl?: string;
  price: number;
  calories: number;
  category: string;
}

export const fetchAllDiets = async (): Promise<Diet[]> => {
  const res = await fetch(`${API_BASE_URL}/api/diets`, {
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GET diets failed: ${res.status} - ${text}`);
  }

  const data = await res.json();
  return data.diets;
};

export const fetchDietById = async (dietId: string): Promise<Diet> => {
  const res = await fetch(`${API_BASE_URL}/api/diets/${encodeURIComponent(dietId)}`, {
    credentials: 'include',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Diet not found: ${res.status} - ${text}`);
  }

  return res.json();
};

export const createDiet = async (newDiet: Diet): Promise<{ diet_id: string }> => {
  const res = await fetch(`${API_BASE_URL}/api/diets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(newDiet),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to create diet');
  }

  return res.json();
};

export const updateDiet = async (
  dietId: string,
  updatedFields: Partial<Diet>
): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/api/diets/${encodeURIComponent(dietId)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(updatedFields),
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to update diet');
  }
};

export const deleteDiet = async (dietId: string): Promise<void> => {
  const res = await fetch(`${API_BASE_URL}/api/diets/${encodeURIComponent(dietId)}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.error || 'Failed to delete diet');
  }
};