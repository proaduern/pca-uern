import { prisma } from "@/lib/prisma";

export default async function PesquisaPrecosHomePage({ pesquisaPrecosId }: { pesquisaPrecosId: string }) {
  const acesso = await prisma.pesquisaPrecos.findUniqueOrThrow({ where: { id: pesquisaPrecosId } });

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold text-slate-900">Pesquisa de Preços</h1>
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-900">{acesso.nome}</span> — matrícula {acesso.matricula},{" "}
          {acesso.funcao}
        </p>
        <p className="mt-3 rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-700">
          Login do subsetor de Pesquisa de Preços pronto. A tela de leitura do PDF de pesquisa e
          registro dos resultados será adicionada em seguida.
        </p>
      </div>
    </div>
  );
}
