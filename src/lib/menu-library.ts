// Cardápios prontos: o buffet importa e depois ajusta à vontade.
// Fotos reais do Wikimedia Commons (licenças livres, crédito obrigatório) em /public/cardapios.
// priceRange = faixa de mercado por pessoa (comida + serviço básico, sem bebidas), usada no pré-orçamento.

export interface LibraryItem {
  section: string;
  name: string;
  quantity: string;
}

export interface LibraryMenu {
  key: string;
  name: string;
  category: string;
  description: string;
  image: string;
  credit: string;
  priceRange: { min: number; max: number };
  items: LibraryItem[];
}

const P = 'Prato principal';
const A = 'Acompanhamentos';
const S = 'Saladas';
const E = 'Entradas';
const D = 'Sobremesa';

export const MENU_LIBRARY: LibraryMenu[] = [
  {
    key: 'feijoada',
    name: 'Feijoada Completa',
    category: 'Tradicional brasileiro',
    description: 'A clássica feijoada com carnes selecionadas e todos os acompanhamentos tradicionais.',
    image: '/cardapios/feijoada.jpg',
    credit: 'Foto: Bradleyzm / Wikimedia Commons, CC BY-SA 4.0',
    priceRange: { min: 55, max: 95 },
    items: [
      { section: E, name: 'Caldinho de feijão', quantity: '1 copinho/pessoa' },
      { section: E, name: 'Torresmo pururuca', quantity: '40 g/pessoa' },
      { section: P, name: 'Feijoada (feijão preto, costelinha, paio, linguiça, carne seca, lombo)', quantity: '400 g/pessoa' },
      { section: A, name: 'Arroz branco', quantity: '120 g/pessoa' },
      { section: A, name: 'Couve refogada no alho', quantity: '50 g/pessoa' },
      { section: A, name: 'Farofa de bacon', quantity: '40 g/pessoa' },
      { section: A, name: 'Laranja em rodelas', quantity: '1/2 un/pessoa' },
      { section: A, name: 'Banana à milanesa', quantity: '1 un/pessoa' },
      { section: A, name: 'Vinagrete', quantity: '40 g/pessoa' },
      { section: D, name: 'Doce de leite com queijo', quantity: '1 porção/pessoa' },
    ],
  },
  {
    key: 'churrasco',
    name: 'Churrasco Tradicional',
    category: 'Churrasco',
    description: 'Churrasco completo com cortes nobres na brasa, pão de alho e acompanhamentos.',
    image: '/cardapios/churrasco.jpg',
    credit: 'Foto: Leonardo "Leguas" Carvalho / Wikimedia Commons, CC BY-SA 2.5',
    priceRange: { min: 65, max: 120 },
    items: [
      { section: E, name: 'Pão de alho', quantity: '1 un/pessoa' },
      { section: E, name: 'Queijo coalho com melaço', quantity: '1 espeto/2 pessoas' },
      { section: P, name: 'Picanha', quantity: '150 g/pessoa' },
      { section: P, name: 'Fraldinha', quantity: '120 g/pessoa' },
      { section: P, name: 'Linguiça toscana', quantity: '80 g/pessoa' },
      { section: P, name: 'Coxinha da asa e coração de frango', quantity: '100 g/pessoa' },
      { section: A, name: 'Arroz branco', quantity: '100 g/pessoa' },
      { section: A, name: 'Farofa da casa', quantity: '40 g/pessoa' },
      { section: A, name: 'Vinagrete', quantity: '50 g/pessoa' },
      { section: S, name: 'Salada de maionese', quantity: '80 g/pessoa' },
      { section: S, name: 'Salada verde', quantity: '40 g/pessoa' },
    ],
  },
  {
    key: 'strogonoff',
    name: 'Strogonoff de Carne e Frango',
    category: 'Pratos quentes',
    description: 'Dois strogonoffs cremosos servidos com arroz branco e batata palha.',
    image: '/cardapios/strogonoff.jpg',
    credit: 'Foto: Pittaya Sroilong / Wikimedia Commons, CC BY 2.0',
    priceRange: { min: 45, max: 80 },
    items: [
      { section: P, name: 'Strogonoff de carne (alcatra) com champignon', quantity: '150 g/pessoa' },
      { section: P, name: 'Strogonoff de frango', quantity: '150 g/pessoa' },
      { section: A, name: 'Arroz branco', quantity: '150 g/pessoa' },
      { section: A, name: 'Batata palha', quantity: '30 g/pessoa' },
      { section: S, name: 'Salada de folhas com tomate', quantity: '50 g/pessoa' },
      { section: D, name: 'Pavê de chocolate', quantity: '1 porção/pessoa' },
    ],
  },
  {
    key: 'molho-madeira',
    name: 'Carne ao Molho Madeira',
    category: 'Pratos quentes',
    description: 'Medalhões de carne ao molho madeira com champignon, arroz à grega e purê.',
    image: '/cardapios/molho-madeira.jpg',
    credit: 'Foto: _e.t / Wikimedia Commons, CC BY-SA 2.0',
    priceRange: { min: 55, max: 95 },
    items: [
      { section: P, name: 'Medalhão de carne ao molho madeira com champignon', quantity: '220 g/pessoa' },
      { section: P, name: 'Filé de frango grelhado', quantity: '100 g/pessoa' },
      { section: A, name: 'Arroz à grega', quantity: '120 g/pessoa' },
      { section: A, name: 'Purê de batata', quantity: '100 g/pessoa' },
      { section: S, name: 'Salada tropical', quantity: '60 g/pessoa' },
      { section: D, name: 'Mousse de maracujá', quantity: '1 porção/pessoa' },
    ],
  },
  {
    key: 'parmegiana',
    name: 'Parmegiana de Carne e Frango',
    category: 'Pratos quentes',
    description: 'Parmegiana gratinada de carne e de frango, com arroz e batata frita.',
    image: '/cardapios/parmegiana.jpg',
    credit: 'Foto: Márcia Cristina Machado / Wikimedia Commons, CC BY-SA 4.0',
    priceRange: { min: 50, max: 85 },
    items: [
      { section: P, name: 'Bife à parmegiana', quantity: '150 g/pessoa' },
      { section: P, name: 'Frango à parmegiana', quantity: '150 g/pessoa' },
      { section: A, name: 'Arroz branco', quantity: '150 g/pessoa' },
      { section: A, name: 'Batata frita', quantity: '100 g/pessoa' },
      { section: S, name: 'Salada verde', quantity: '50 g/pessoa' },
      { section: D, name: 'Pudim de leite', quantity: '1 fatia/pessoa' },
    ],
  },
  {
    key: 'lasanha',
    name: 'Festival de Massas e Lasanha',
    category: 'Massas',
    description: 'Lasanha à bolonhesa, lasanha de frango e massa ao sugo, com pão italiano.',
    image: '/cardapios/lasanha.jpg',
    credit: 'Foto: Chris Olszewski / Wikimedia Commons, CC BY-SA 4.0',
    priceRange: { min: 45, max: 80 },
    items: [
      { section: P, name: 'Lasanha à bolonhesa', quantity: '200 g/pessoa' },
      { section: P, name: 'Lasanha de frango com requeijão', quantity: '150 g/pessoa' },
      { section: P, name: 'Penne ao molho sugo com manjericão', quantity: '100 g/pessoa' },
      { section: A, name: 'Pão italiano', quantity: '2 fatias/pessoa' },
      { section: A, name: 'Queijo parmesão ralado', quantity: '15 g/pessoa' },
      { section: S, name: 'Salada caprese', quantity: '60 g/pessoa' },
    ],
  },
  {
    key: 'galinhada',
    name: 'Galinhada Caipira',
    category: 'Tradicional brasileiro',
    description: 'Galinhada caipira com açafrão e cheiro-verde, servida com acompanhamentos da roça.',
    image: '/cardapios/galinhada.jpg',
    credit: 'Foto: iurikothe / Wikimedia Commons, CC BY 2.0',
    priceRange: { min: 40, max: 70 },
    items: [
      { section: P, name: 'Galinhada com açafrão e cheiro-verde', quantity: '350 g/pessoa' },
      { section: A, name: 'Feijão tropeiro', quantity: '100 g/pessoa' },
      { section: A, name: 'Mandioca cozida na manteiga', quantity: '80 g/pessoa' },
      { section: S, name: 'Salada de tomate com cebola', quantity: '50 g/pessoa' },
      { section: D, name: 'Doce de abóbora', quantity: '1 porção/pessoa' },
    ],
  },
  {
    key: 'salgados',
    name: 'Coquetel de Salgados',
    category: 'Coquetel / festa',
    description: 'Salgados fritos e assados na hora, ideal para aniversários e confraternizações.',
    image: '/cardapios/salgados.jpg',
    credit: 'Foto: Romerito Pontes / Wikimedia Commons, CC BY 2.0',
    priceRange: { min: 35, max: 65 },
    items: [
      { section: 'Salgados fritos', name: 'Coxinha de frango', quantity: '5 un/pessoa' },
      { section: 'Salgados fritos', name: 'Bolinha de queijo', quantity: '4 un/pessoa' },
      { section: 'Salgados fritos', name: 'Risole de carne', quantity: '3 un/pessoa' },
      { section: 'Salgados fritos', name: 'Kibe', quantity: '3 un/pessoa' },
      { section: 'Salgados assados', name: 'Esfiha de carne', quantity: '3 un/pessoa' },
      { section: 'Salgados assados', name: 'Empadinha de frango', quantity: '3 un/pessoa' },
      { section: 'Salgados assados', name: 'Enroladinho de salsicha', quantity: '3 un/pessoa' },
      { section: D, name: 'Docinhos (brigadeiro, beijinho, cajuzinho)', quantity: '4 un/pessoa' },
    ],
  },
];

export const libraryMenu = (key: string | null | undefined) => MENU_LIBRARY.find((m) => m.key === key) ?? null;

/** Ordem padrão das seções ao exibir/agrupar itens. */
export const SECTION_ORDER = [E, P, A, S, 'Salgados fritos', 'Salgados assados', D, 'Bebidas'];

export function groupBySection<T extends { section?: string | null }>(items: T[]): { section: string; items: T[] }[] {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const s = (it.section || '').trim() || 'Itens';
    if (!map.has(s)) map.set(s, []);
    map.get(s)!.push(it);
  }
  const rank = (s: string) => {
    const i = SECTION_ORDER.indexOf(s);
    return i === -1 ? SECTION_ORDER.length : i;
  };
  return [...map.entries()].sort((a, b) => rank(a[0]) - rank(b[0])).map(([section, items]) => ({ section, items }));
}
