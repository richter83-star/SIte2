import { prisma } from '../src/lib/prisma';
import { PREBUILT_AGENTS } from '../src/lib/agents/prebuilt';

async function main() {
  console.log('🌱 Seeding database...');

  // Seed agents
  console.log('Creating agents...');
  for (const agent of PREBUILT_AGENTS) {
    await prisma.agent.upsert({
      where: { slug: agent.slug },
      update: {
        name: agent.name,
        description: agent.description,
        capabilities: agent.capabilities,
        systemPrompt: agent.systemPrompt,
        modelPreference: agent.modelPreference,
        pricePerMonth: agent.pricePerMonth,
        tier: agent.tier,
        icon: agent.icon,
        featured: agent.featured,
      },
      create: {
        ...agent,
        active: true,
      } as any,
    });
    console.log(`✓ Created agent: ${agent.name}`);
  }

  console.log(`\n✅ Created ${PREBUILT_AGENTS.length} agents`);

  // Get counts
  const agentCount = await prisma.agent.count();
  
  console.log('\n📊 Database summary:');
  console.log(`- ${agentCount} agents`);
  console.log('\n✨ Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
