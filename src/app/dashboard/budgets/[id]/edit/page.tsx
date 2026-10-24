'use client';

import { useParams } from 'next/navigation';
import { BudgetForm } from '@/components/budget/BudgetForm';

export default function EditBudgetPage() {
  const params = useParams<{ id: string }>();
  return params?.id ? <BudgetForm key={params.id} budgetId={params.id} /> : null;
}
