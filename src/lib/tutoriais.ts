/**
 * Vídeos da página "Como usar" (/como-usar).
 *
 * Para adicionar um vídeo, preencha `video` com:
 *  - link do YouTube (youtube.com/watch?v=..., youtu.be/..., /shorts/...)
 *  - link do Vimeo (vimeo.com/123456)
 *  - arquivo próprio: coloque em public/videos/ e use '/videos/nome.mp4'
 *    (capa: '/videos/nome.jpg' — gere com ffmpeg -ss 4 -i nome.mp4 -frames:v 1 nome.jpg)
 * Vídeo com `video` vazio aparece como "Em breve".
 *
 * `perfis` define em qual aba o vídeo aparece (pode estar em mais de uma).
 */
export type Perfil = 'admin' | 'usuario' | 'master';

export const PERFIS: { key: Perfil; label: string; descricao: string }[] = [
  { key: 'admin', label: 'Dono / Administrador', descricao: 'Configuração do buffet, vendas, financeiro e equipe.' },
  { key: 'usuario', label: 'Funcionário', descricao: 'O dia a dia: clientes, eventos, agenda e orçamentos.' },
  { key: 'master', label: 'Master', descricao: 'Administração da plataforma: empresas e aprovações.' },
];

const A: Perfil[] = ['admin'];
const AU: Perfil[] = ['admin', 'usuario'];
const M: Perfil[] = ['master'];

export interface Tutorial {
  id: string;
  perfis: Perfil[];
  categoria: string;
  titulo: string;
  descricao: string;
  video: string;
  /** Duração exibida no card, ex.: '2:30' (opcional). */
  duracao?: string;
  /** Imagem de capa do card (opcional; YouTube gera a sua sozinho). */
  capa?: string;
}

export const TUTORIAIS: Tutorial[] = [
  { id: 'primeiro-acesso', perfis: AU, categoria: 'Começando', titulo: 'Primeiro acesso e visão geral', descricao: 'Conheça o painel, o menu e onde fica cada coisa.', video: '/videos/conhecendo-o-painel.mp4', capa: '/videos/conhecendo-o-painel.jpg', duracao: '1:32' },
  { id: 'funcionario-acesso', perfis: ['usuario'], categoria: 'Começando', titulo: 'Primeiro acesso do funcionário', descricao: 'Entrando com o login recebido e vendo as áreas liberadas para você.', video: '' },
  { id: 'configuracoes', perfis: A, categoria: 'Começando', titulo: 'Configurando os dados do buffet', descricao: 'Logo, contatos e informações que aparecem nos orçamentos.', video: '' },
  { id: 'instalar-app', perfis: AU, categoria: 'Começando', titulo: 'Instalando o app no celular', descricao: 'Coloque o Agenda Buffet na tela inicial do Android ou iPhone.', video: '/videos/instalar-app.mp4', capa: '/videos/instalar-app.jpg', duracao: '2:24' },

  { id: 'clientes', perfis: AU, categoria: 'Clientes e eventos', titulo: 'Cadastrando clientes', descricao: 'Como cadastrar, editar e encontrar seus clientes.', video: '/videos/cadastrar-cliente.mp4', capa: '/videos/cadastrar-cliente.jpg', duracao: '1:00' },
  { id: 'eventos', perfis: AU, categoria: 'Clientes e eventos', titulo: 'Criando um evento', descricao: 'Data, local, convidados, cardápio e valores do evento.', video: '/videos/criar-evento.mp4', capa: '/videos/criar-evento.jpg', duracao: '2:17' },
  { id: 'agenda', perfis: AU, categoria: 'Clientes e eventos', titulo: 'Usando a agenda', descricao: 'Veja os eventos do mês e evite conflitos de data.', video: '/videos/financeiro-e-agenda.mp4', capa: '/videos/financeiro-e-agenda.jpg', duracao: '1:33' },

  { id: 'pre-orcamento', perfis: AU, categoria: 'Vendas', titulo: 'Pré-orçamento: quanto cobrar', descricao: 'Calcule o preço por convidado antes de montar a proposta.', video: '' },
  { id: 'orcamentos', perfis: AU, categoria: 'Vendas', titulo: 'Montando e enviando um orçamento', descricao: 'Crie a proposta e envie o link para o cliente.', video: '/videos/orcamentos-e-propostas.mp4', capa: '/videos/orcamentos-e-propostas.jpg', duracao: '1:55' },
  { id: 'vitrine', perfis: A, categoria: 'Vendas', titulo: 'Vitrine e pedidos (leads)', descricao: 'Divulgue seu buffet e receba pedidos de orçamento.', video: '' },
  { id: 'cardapio', perfis: AU, categoria: 'Vendas', titulo: 'Cadastrando o cardápio', descricao: 'Pratos, fotos e preços que entram nos orçamentos.', video: '' },

  { id: 'financeiro', perfis: A, categoria: 'Financeiro', titulo: 'Contas a pagar e receber', descricao: 'Lançamentos, filtros e acompanhamento do caixa.', video: '/videos/financeiro-e-agenda.mp4', capa: '/videos/financeiro-e-agenda.jpg', duracao: '1:33' },
  { id: 'despesas-evento', perfis: A, categoria: 'Financeiro', titulo: 'Despesas do evento e reembolso', descricao: 'Registre os gastos de cada evento por categoria.', video: '/videos/despesas-e-reembolsos.mp4', capa: '/videos/despesas-e-reembolsos.jpg', duracao: '1:43' },

  { id: 'equipe', perfis: A, categoria: 'Equipe', titulo: 'Funcionários e usuários', descricao: 'Cadastre a equipe e defina o que cada um pode acessar.', video: '' },

  { id: 'master-painel', perfis: M, categoria: 'Plataforma', titulo: 'Conhecendo o Painel Master', descricao: 'Lista de empresas, status e filtros.', video: '' },
  { id: 'master-nova-empresa', perfis: M, categoria: 'Plataforma', titulo: 'Cadastrando uma nova empresa', descricao: 'Crie o buffet já aprovado com o login do dono.', video: '' },
  { id: 'master-aprovar', perfis: M, categoria: 'Plataforma', titulo: 'Aprovando, recusando e bloqueando buffets', descricao: 'Analise cadastros novos e controle o acesso das empresas.', video: '' },
];

export type VideoSource =
  | { kind: 'embed'; src: string; thumb?: string }
  | { kind: 'file'; src: string }
  | { kind: 'none' };

/** Converte o link informado em algo que dá para tocar na página. */
export function videoSource(url: string): VideoSource {
  const u = url.trim();
  if (!u) return { kind: 'none' };

  const yt = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i);
  if (yt) {
    return {
      kind: 'embed',
      src: `https://www.youtube-nocookie.com/embed/${yt[1]}?rel=0&autoplay=1`,
      thumb: `https://i.ytimg.com/vi/${yt[1]}/hqdefault.jpg`,
    };
  }

  const vimeo = u.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vimeo) return { kind: 'embed', src: `https://player.vimeo.com/video/${vimeo[1]}?autoplay=1` };

  return { kind: 'file', src: u };
}
