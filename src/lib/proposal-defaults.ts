// Textos iniciais da proposta. Um orçamento novo copia os textos do último
// orçamento do buffet; estes só valem para o primeiro.

export function defaultCoverMessage(buffetName: string, responsibleName?: string | null) {
  const signature = [responsibleName?.trim(), buffetName.trim()].filter(Boolean).join('\n');
  return `Olá, {cliente}! Tudo bem?

Conforme conversamos, segue a nossa proposta de buffet para o seu evento. Montamos um cardápio pensado nas suas preferências para proporcionar uma excelente experiência aos seus convidados.

Fico à disposição para ajustar qualquer detalhe e deixar tudo exatamente como você imagina. Se preferir, podemos marcar uma conversa rápida para alinhar os pontos finais.

Aguardo seu retorno!

Atenciosamente,
${signature}`;
}

export const DEFAULT_INCLUDED_ITEMS = `Compra de todos os insumos e ingredientes do cardápio
Equipe completa para o atendimento
Montagem e organização do buffet
Chegamos 2 horas antes para deixar tudo preparado`;

export const DEFAULT_PROPOSAL_NOTES = `Horas adicionais serão cobradas à parte.`;
