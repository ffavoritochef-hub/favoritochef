'use client';

import { useParams } from 'next/navigation';
import { MenuForm } from '@/components/menu/MenuForm';

export default function EditMenuTemplatePage() {
  const params = useParams<{ id: string }>();
  return params?.id ? <MenuForm key={params.id} menuId={params.id} /> : null;
}
