export default function Loading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-4 border-brand-orange border-t-transparent" />
        <p className="mt-2 text-xs text-slate-600">Carregando clientes...</p>
      </div>
    </div>
  )
}
