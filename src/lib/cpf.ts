export const onlyDigits = (v: string) => String(v ?? '').replace(/\D/g, '');

/** Valida CPF pelos dígitos verificadores. */
export function isValidCpf(v: string): boolean {
  const d = onlyDigits(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  const check = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return check(9) === Number(d[9]) && check(10) === Number(d[10]);
}

/** 12345678909 -> 123.456.789-09 (formata parcialmente enquanto digita). */
export function formatCpf(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

/** Esconde o CPF para exibição pública: ***.456.789-** */
export function maskCpf(v: string): string {
  const d = onlyDigits(v);
  if (d.length !== 11) return '***';
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}
