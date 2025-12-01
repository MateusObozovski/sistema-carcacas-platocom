export default function Loading() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-6 w-6 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="mt-2 text-xs text-gray-400">Carregando clientes...</p>
      </div>
    </div>
  )
}
