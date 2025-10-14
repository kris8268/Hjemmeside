// apps/web/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding demo data...');

  const user = await prisma.user.upsert({
    where: { email: 'founder@example.com' },
    update: {},
    create: {
      email: 'founder@example.com',
      name: 'Demo Founder',
      authProvider: 'clerk',
      externalId: 'demo-user-001'
    }
  });

  const org = await prisma.org.create({
    data: {
      name: 'Acme Demo',
      region: 'eu-central',
      members: {
        create: [{ userId: user.id, role: 'owner', acceptedAt: new Date() }]
      }
    }
  });

  await prisma.connection.createMany({
    data: [
      {
        orgId: org.id,
        provider: 'slack',
        accountLabel: 'Acme Slack',
        nangoConnectionId: 'nango_conn_slack_demo',
        scopes: ['chat:write', 'chat:write.public'],
        createdByUserId: user.id
      },
      {
        orgId: org.id,
        provider: 'google',
        accountLabel: 'Acme Google',
        nangoConnectionId: 'nango_conn_google_demo',
        scopes: [
          'https://www.googleapis.com/auth/drive',
          'https://www.googleapis.com/auth/spreadsheets'
        ],
        createdByUserId: user.id
      }
    ]
  });

  const flow = await prisma.flow.create({
    data: {
      orgId: org.id,
      name: 'Demo: Webhook → Mapper → Slack',
      createdByUserId: user.id
    }
  });

  const graphJson = {
    nodes: [
      {
        id: 'trigger1',
        type: 'trigger.webhook',
        name: 'Inbound Webhook',
        config: { path: '/demo/incoming', secretRef: 'svix' }
      },
      {
        id: 'map1',
        type: 'mapper',
        name: 'Pick fields',
        config: { picks: ['customer.name', 'customer.email', 'order.total'] }
      },
      {
        id: 'slack1',
        type: 'slack.sendMessage',
        name: 'Notify Slack',
        config: {
          channel: '#alerts',
          text: 'New order from {{customer.name}} ({{order.total}})'
        }
      }
    ],
    edges: [
      { from: 'trigger1', to: 'map1' },
      { from: 'map1', to: 'slack1' }
    ]
  };

  const version = await prisma.flowVersion.create({
    data: {
      flowId: flow.id,
      versionSemver: '1.0.0',
      graphJson,
      createdByUserId: user.id
    }
  });

  await prisma.flow.update({
    where: { id: flow.id },
    data: { activeVersionId: version.id }
  });

  await prisma.scheduledTrigger.create({
    data: {
      flowVersionId: version.id,
      cron: '0 7 * * *',
      timezone: 'Europe/Copenhagen',
      isPaused: false
    }
  });

  const run = await prisma.run.create({
    data: {
      orgId: org.id,
      flowVersionId: version.id,
      triggerType: 'webhook',
      idempotencyKey: 'demo-run-1',
      status: 'ok',
      triggerPayload: {
        example: true,
        customer: { name: 'Ada', email: 'ada@example.com' },
        order: { total: 123.45 }
      },
      startedAt: new Date(Date.now() - 60_000),
      finishedAt: new Date()
    }
  });

  await prisma.runStep.createMany({
    data: [
      {
        runId: run.id,
        stepKey: 'trigger1',
        status: 'ok',
        logsPointer: 'logs/demo/trigger1.log',
        startedAt: new Date(Date.now() - 60_000),
        finishedAt: new Date(Date.now() - 45_000)
      },
      {
        runId: run.id,
        stepKey: 'map1',
        status: 'ok',
        logsPointer: 'logs/demo/map1.log',
        startedAt: new Date(Date.now() - 45_000),
        finishedAt: new Date(Date.now() - 30_000)
      },
      {
        runId: run.id,
        stepKey: 'slack1',
        status: 'ok',
        logsPointer: 'logs/demo/slack1.log',
        startedAt: new Date(Date.now() - 30_000),
        finishedAt: new Date(Date.now() - 10_000)
      }
    ]
  });

  await prisma.artifact.create({
    data: {
      orgId: org.id,
      runId: run.id,
      path: 'artifacts/demo/payload.json',
      mediaType: 'application/json',
      size: 256,
      checksum: 'sha256-demo'
    }
  });

  await prisma.auditLog.createMany({
    data: [
      { orgId: org.id, actorUserId: user.id, action: 'org.create', targetType: 'org', targetId: org.id, ts: new Date() },
      { orgId: org.id, actorUserId: user.id, action: 'flow.create', targetType: 'flow', targetId: flow.id, ts: new Date() },
      { orgId: org.id, actorUserId: user.id, action: 'flow.activate', targetType: 'flowVersion', targetId: version.id, ts: new Date() },
      { orgId: org.id, actorUserId: user.id, action: 'run.create', targetType: 'run', targetId: run.id, ts: new Date() }
    ]
  });

  console.log('✅ Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
