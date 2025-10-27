import { prisma } from "@/src/lib/db"

export async function GET(req: Request) {
  // find due schedules (simpelt: nextRunAt <= now())
  const due = await prisma.automationSchedule.findMany({
    where: { enabled: true, nextRunAt: { lte: new Date() } },
    include: { automation: true },
    take: 10,
  })

  for (const s of due) {
    const run = await prisma.automationRun.create({
      data: { automationId: s.automationId, status: "queued" },
    })

    // fire-and-forget POST til /api/run
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ runId: run.id }),
    }).catch(() => {})
  }

  return Response.json({ queued: due.length })
}
