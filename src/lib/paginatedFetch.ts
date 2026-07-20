/**
 * Utilitário para contornar o limite padrão de linhas por requisição do
 * Supabase/PostgREST (1000 registros).
 *
 * Sem paginação, qualquer query que devolva mais de 1000 linhas é truncada
 * silenciosamente pelo PostgREST — nenhum erro é lançado, os dados apenas
 * "somem". Isso é especialmente perigoso em somas/agregações feitas no
 * cliente (saldo de caixa, receita de relatórios, listagens de visitas e
 * serviços), pois o resultado fica incorreto sem qualquer aviso.
 *
 * `fetchAllRows` recebe o próprio query builder do supabase-js (ainda não
 * "aguardado") e repete a busca em lotes usando `.range()` até obter todas
 * as linhas que atendem aos filtros já aplicados na query.
 *
 * Exemplo de uso:
 * ```ts
 * let query = supabase.from('caixa_movimentos').select('valor')
 * const rows = await fetchAllRows<{ valor: number }>(query)
 * ```
 *
 * Importante: não usar em queries que já possuam `.range()`/`.limit()`
 * propositalmente (ex.: "últimos 10 registros"), pois o objetivo dessas
 * queries é justamente limitar o resultado.
 */
export async function fetchAllRows<T = any>(
  query: PromiseLike<{ data: T[] | null; error: any }> & {
    range: (from: number, to: number) => any
  },
  pageSize = 1000
): Promise<T[]> {
  const allRows: T[] = []
  let from = 0

  while (true) {
    const { data, error } = await query.range(from, from + pageSize - 1)

    if (error) throw error

    const batch = data || []
    allRows.push(...batch)

    // Se voltou menos que o tamanho da página, não há mais linhas a buscar
    if (batch.length < pageSize) break

    from += pageSize
  }

  return allRows
}
