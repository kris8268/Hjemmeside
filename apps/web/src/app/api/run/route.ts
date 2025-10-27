import { prisma } from "@/src/lib/db"
import { registry } from "@/src/automations/registry"

export async function POST(req: Request) {
  const { runId } = await req.json()

  const run = await prisma.automationRun.update({
    where: { id: runId },
    data: { status: "running", startedAt: new Date() },
    include: { automation: { include: { template: true } } },
  })

  const slug = run.automation.template.slug
  const entry = registry[slug as keyof typeof registry]
  if (!entry) {
    await prisma.automationRun.update({
      where: { id: runId },
      data: { status: "error", error: `Unknown template: ${slug}` },
    })
    return Response.json({ ok: false }, { status: 400 })
  }

  let logs = ""
  const ctx = { log: (line: string) => (logs += line + "\n") }

  try {
    await entry.run(run.automation.params as any, ctx)
    await prisma.automationRun.update({
      where: { id: runId },
      data: { status: "success", logs, finishedAt: new Date() },
    })
    return Response.json({ ok: true })
  } catch (e: any) {
    await prisma.automationRun.update({
      where: { id: runId },
      data: { status: "error", error: String(e), logs, finishedAt: new Date() },
    })
    return Response.json({ ok: false }, { status: 500 })
  }
}
