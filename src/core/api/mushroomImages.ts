import { axiosClient } from './axiosClient';
import { API_ENDPOINTS } from './endpoints';
export interface MushroomImageEntry { mushroom_type_id: number; name: string; image_url: string | null }
let cached: MushroomImageEntry[] | undefined;
let expiresAt = 0;
let pending: Promise<MushroomImageEntry[]> | undefined;
// Floor polling shares one catalogue request; failed requests do not block the tray layout.
export async function getMushroomImages(): Promise<MushroomImageEntry[]> {
  if (cached && Date.now() < expiresAt) return cached;
  if (pending) return pending;
  pending = axiosClient.get<{ data: MushroomImageEntry[] } | MushroomImageEntry[]>(API_ENDPOINTS.MUSHROOM_TYPES.BASE)
    .then(response => {
      const entries = Array.isArray(response.data) ? response.data : response.data.data;
      cached = entries;
      expiresAt = Date.now() + 60000;
      return entries;
    }).catch(() => []).finally(() => { pending = undefined; });
  return pending;
}
export function findMushroomImage(entries: MushroomImageEntry[], id?: number | null, name?: string | null): string | undefined {
  const entryById = id != null
    ? entries.find(item => Number(item.mushroom_type_id) === Number(id))
    : undefined;
  const entryByName = name
    ? entries.find(item => item.name.trim().toLocaleLowerCase('vi') === name.trim().toLocaleLowerCase('vi'))
    : undefined;
  const entry = entryById ?? entryByName;
  return entry?.image_url?.trim() || undefined;
}
