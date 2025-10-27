export type RunCtx = {
  log: (line: string) => void
}

export async function run(params: { name?: string }, ctx: RunCtx) {
  ctx.log(`Hej ${params.name ?? "verden"} 👋`)
  // lav dit arbejde her: fetch, skriv til db, kald API, osv.
  return { ok: true }
}
