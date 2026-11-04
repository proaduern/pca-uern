import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function VerificarDocumentoIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ codigo?: string }>;
}) {
  const { codigo } = await searchParams;
  if (codigo && codigo.trim()) {
    redirect(`/verificar/${encodeURIComponent(codigo.trim().toUpperCase())}`);
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 border-b border-slate-100 pb-4">
          <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
            UERN · PROAD · Sistema PCA
          </span>
          <h1 className="mt-2 text-xl font-bold text-slate-900">
            Conferência Pública de Autenticidade de Documentos
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Informe o Código Verificador impresso no rodapé do PDF gerado pelo Sistema PCA UERN para
            validar sua autenticidade e integridade.
          </p>
        </div>

        <form action="/verificar" method="GET" className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-700">
              Código Verificador
            </label>
            <input
              type="text"
              name="codigo"
              required
              placeholder="Ex.: A1B2-C3D4-E5F6"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 font-mono text-sm uppercase tracking-wider text-slate-900 focus:border-blue-600 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Consultar Autenticidade
          </button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-4 text-center">
          <Link href="/" className="text-xs font-medium text-slate-500 hover:text-slate-800">
            Voltar ao Sistema PCA UERN
          </Link>
        </div>
      </div>
    </main>
  );
}
