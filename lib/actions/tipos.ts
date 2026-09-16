/**
 * Contrato de retorno das server actions chamadas diretamente pelo cliente
 * (fora do padrão useActionState/<form action>). Nunca usar `throw` para
 * comunicar um erro de validação/negócio para o cliente nessas actions: em
 * produção (Next.js 16.3.5 + React 19.2.8), uma exceção lançada nesse
 * caminho é redigida para um código genérico e quebra a tela no cliente —
 * ver o commit que introduziu este arquivo para a investigação completa.
 * Em vez disso, a action captura o próprio erro e retorna { erro }.
 */
export interface ResultadoAcao {
  erro?: string;
}
