// Acesso a dados dos cardápios (menu_templates + menu_template_items) no navegador.
// Funciona mesmo antes da migração 0009 (sem colunas de foto/preço/seção): tenta de novo sem elas.

import { supabase } from '@/lib/supabase';
import { libraryMenu } from '@/lib/menu-library';

export interface MenuItemRow {
  section: string;
  name: string;
  quantity: string;
}

export interface MenuData {
  name: string;
  description: string;
  image_url: string | null;
  image_credit: string | null;
  price_per_person: number | null;
  library_key: string | null;
  is_active: boolean;
}

export interface MenuRecord extends MenuData {
  id: string;
  created_at?: string;
  items: (MenuItemRow & { position: number })[];
}

const NEW_MENU_COLS = ['image_url', 'image_credit', 'price_per_person', 'library_key'] as const;
const NEW_ITEM_COLS = ['section', 'position'] as const;

/** Coluna ainda não existe no banco (migração 0009 pendente). */
export const isMissingColumn = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === 'PGRST204' || e.code === '42703' || /column .* does not exist|Could not find the .* column/i.test(e.message || ''));

let warned = false;
export let migrationPending = false;
const markPending = () => {
  migrationPending = true;
  if (!warned) {
    warned = true;
    console.warn('Migração 0009 pendente: fotos, preço e seções dos cardápios não serão salvos.');
  }
};

const strip = <T extends Record<string, unknown>>(row: T, cols: readonly string[]) => {
  const copy: Record<string, unknown> = { ...row };
  for (const c of cols) delete copy[c];
  return copy;
};

const SELECT_FULL: string =
  'id, name, description, is_active, created_at, image_url, image_credit, price_per_person, library_key, items:menu_template_items(custom_item_name, custom_quantity, section, position)';
const SELECT_BASIC: string = 'id, name, description, is_active, created_at, items:menu_template_items(custom_item_name, custom_quantity)';

type RawItem = { custom_item_name: string | null; custom_quantity: string | null; section?: string | null; position?: number | null };
type RawMenu = {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean | null;
  created_at?: string;
  image_url?: string | null;
  image_credit?: string | null;
  price_per_person?: number | string | null;
  library_key?: string | null;
  items: RawItem[] | null;
};

function toRecord(m: RawMenu): MenuRecord {
  const items = (m.items ?? [])
    .map((i, idx) => ({
      section: i.section?.trim() || '',
      name: i.custom_item_name?.trim() || '',
      quantity: i.custom_quantity?.trim() || '',
      position: typeof i.position === 'number' ? i.position : idx,
    }))
    .filter((i) => i.name)
    .sort((a, b) => a.position - b.position);
  const price = m.price_per_person == null ? null : Number(m.price_per_person);
  return {
    id: String(m.id),
    name: m.name,
    description: m.description || '',
    is_active: m.is_active !== false,
    created_at: m.created_at,
    image_url: m.image_url || libraryMenu(m.library_key)?.image || null,
    image_credit: m.image_credit || null,
    price_per_person: price != null && Number.isFinite(price) ? price : null,
    library_key: m.library_key || null,
    items,
  };
}

export async function listMenus(): Promise<MenuRecord[]> {
  let res = await supabase.from('menu_templates').select(SELECT_FULL).order('name');
  if (isMissingColumn(res.error)) {
    markPending();
    res = await supabase.from('menu_templates').select(SELECT_BASIC).order('name');
  }
  if (res.error) throw res.error;
  return ((res.data ?? []) as unknown as RawMenu[]).map(toRecord);
}

export async function getMenu(id: string): Promise<MenuRecord | null> {
  let res = await supabase.from('menu_templates').select(SELECT_FULL).eq('id', id).maybeSingle();
  if (isMissingColumn(res.error)) {
    markPending();
    res = await supabase.from('menu_templates').select(SELECT_BASIC).eq('id', id).maybeSingle();
  }
  if (res.error) throw res.error;
  return res.data ? toRecord(res.data as unknown as RawMenu) : null;
}

async function writeItems(menuId: string, items: MenuItemRow[]) {
  const del = await supabase.from('menu_template_items').delete().eq('menu_template_id', menuId);
  if (del.error) throw del.error;
  const rows = items
    .filter((i) => i.name.trim())
    .map((i, position) => ({
      menu_template_id: menuId,
      custom_item_name: i.name.trim(),
      custom_quantity: i.quantity.trim(),
      section: i.section.trim() || null,
      position,
    }));
  if (!rows.length) return;
  let ins = await supabase.from('menu_template_items').insert(rows);
  if (isMissingColumn(ins.error)) {
    markPending();
    ins = await supabase.from('menu_template_items').insert(rows.map((r) => strip(r, NEW_ITEM_COLS)));
  }
  if (ins.error) throw ins.error;
}

/** Cria (id vazio) ou atualiza um cardápio e substitui os itens. Retorna o id. */
export async function saveMenu(id: string | null, data: MenuData, items: MenuItemRow[]): Promise<string> {
  const row = {
    name: data.name.trim(),
    description: data.description.trim() || null,
    is_active: data.is_active,
    image_url: data.image_url,
    image_credit: data.image_credit,
    price_per_person: data.price_per_person,
    library_key: data.library_key,
  };
  const run = (r: Record<string, unknown>) =>
    id
      ? supabase.from('menu_templates').update(r).eq('id', id).select('id').single()
      : supabase.from('menu_templates').insert([r]).select('id').single();
  let res = await run(row);
  if (isMissingColumn(res.error)) {
    markPending();
    res = await run(strip(row, NEW_MENU_COLS));
  }
  if (res.error) throw res.error;
  const menuId = String(res.data.id);
  await writeItems(menuId, items);
  return menuId;
}

export async function setMenuActive(id: string, active: boolean) {
  const { error } = await supabase.from('menu_templates').update({ is_active: active }).eq('id', id);
  if (error) throw error;
}

/**
 * Exclui o cardápio. Orçamentos e leads que usavam ele ficam "Personalizado".
 * Retorna false se o banco recusar por vínculo (aí o certo é desativar).
 */
export async function deleteMenu(id: string): Promise<boolean> {
  await supabase.from('budgets').update({ menu_template_id: null }).eq('menu_template_id', id);
  const items = await supabase.from('menu_template_items').delete().eq('menu_template_id', id);
  if (items.error) throw items.error;
  const { error } = await supabase.from('menu_templates').delete().eq('id', id);
  if (error) {
    if (error.code === '23503') return false;
    throw error;
  }
  return true;
}

export async function duplicateMenu(m: MenuRecord): Promise<string> {
  return saveMenu(null, { ...m, name: `${m.name} (cópia)`.slice(0, 120) }, m.items);
}

/** Copia um cardápio pronto da biblioteca para os cardápios do buffet. */
export async function importLibraryMenu(key: string): Promise<string> {
  const lib = libraryMenu(key);
  if (!lib) throw new Error('Cardápio pronto não encontrado.');
  return saveMenu(
    null,
    {
      name: lib.name,
      description: lib.description,
      image_url: lib.image,
      image_credit: lib.credit,
      price_per_person: null,
      library_key: lib.key,
      is_active: true,
    },
    lib.items
  );
}
