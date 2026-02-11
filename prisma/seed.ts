import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Create sample users
  const user1 = await prisma.user.upsert({
    where: { id: "seed_user_1" },
    update: {},
    create: {
      id: "seed_user_1",
      username: "alexdev",
      displayName: "Alex Developer",
      email: "alex@example.com",
      avatarUrl: null,
      bio: "Full-stack developer building AI workflows",
    },
  });

  const user2 = await prisma.user.upsert({
    where: { id: "seed_user_2" },
    update: {},
    create: {
      id: "seed_user_2",
      username: "sambuilder",
      displayName: "Sam Builder",
      email: "sam@example.com",
      avatarUrl: null,
      bio: "AI tooling enthusiast",
    },
  });

  console.log(`Created users: ${user1.username}, ${user2.username}`);

  // Create sample assets
  const commitSkill = await prisma.asset.upsert({
    where: { slug: "smart-commit" },
    update: {},
    create: {
      slug: "smart-commit",
      name: "Smart Commit",
      description:
        "AI skill that analyzes staged changes and generates conventional commit messages with scope detection.",
      type: "SKILL",
      primaryPlatform: "CLAUDE_CODE",
      compatiblePlatforms: ["GEMINI_CLI", "CURSOR"],
      category: "CODE_GENERATION",
      tags: ["git", "commit", "conventional-commits"],
      visibility: "PUBLIC",
      license: "MIT",
      storageType: "INLINE",
      installScope: "USER",
      content: `# Smart Commit Skill

## Description
Analyzes staged git changes and generates a conventional commit message.

## Usage
Run \`/commit\` after staging your changes.

## Behavior
1. Reads \`git diff --staged\`
2. Identifies the type of change (feat, fix, refactor, docs, etc.)
3. Detects the scope from file paths
4. Generates a concise commit message following Conventional Commits spec
`,
      primaryFileName: "SKILL.md",
      currentVersion: "1.2.0",
      downloadCount: 142,
      authorId: user1.id,
    },
  });

  const reviewCommand = await prisma.asset.upsert({
    where: { slug: "code-review-checklist" },
    update: {},
    create: {
      slug: "code-review-checklist",
      name: "Code Review Checklist",
      description:
        "Command that performs a structured code review against a configurable checklist of best practices.",
      type: "COMMAND",
      primaryPlatform: "CLAUDE_CODE",
      compatiblePlatforms: ["GEMINI_CLI", "CURSOR", "WINDSURF"],
      category: "CODE_REVIEW",
      tags: ["review", "quality", "best-practices"],
      visibility: "PUBLIC",
      license: "MIT",
      storageType: "INLINE",
      content: `# Code Review Checklist Command

Review the following code against this checklist:

- [ ] No security vulnerabilities (injection, XSS, etc.)
- [ ] Error handling is comprehensive
- [ ] No hardcoded secrets or credentials
- [ ] Functions are focused and small
- [ ] Variable names are descriptive
- [ ] No unnecessary complexity
- [ ] Tests cover edge cases
- [ ] Documentation is updated

Provide a structured report with pass/fail for each item and specific line references for issues.
`,
      primaryFileName: "review-checklist.md",
      currentVersion: "1.0.0",
      downloadCount: 87,
      authorId: user1.id,
    },
  });

  const testAgent = await prisma.asset.upsert({
    where: { slug: "test-architect" },
    update: {},
    create: {
      slug: "test-architect",
      name: "Test Architect",
      description:
        "An AI agent persona specialized in writing comprehensive test suites with edge case coverage.",
      type: "AGENT",
      primaryPlatform: "CLAUDE_CODE",
      compatiblePlatforms: ["CURSOR"],
      category: "TESTING",
      tags: ["testing", "tdd", "agent"],
      visibility: "PUBLIC",
      license: "APACHE_2",
      storageType: "INLINE",
      installScope: "USER",
      content: `# Test Architect Agent

## System Prompt
You are a senior QA engineer and test architect. Your primary goal is to ensure comprehensive test coverage.

## Behavior
- Always analyze the code under test before writing tests
- Identify edge cases, boundary conditions, and error paths
- Write tests that are independent and deterministic
- Follow the Arrange-Act-Assert pattern
- Generate both unit tests and integration tests where appropriate

## Tools
- File read/write for creating test files
- Terminal access for running test suites
- Code search for understanding dependencies
`,
      primaryFileName: "agent-config.md",
      currentVersion: "2.0.0",
      downloadCount: 203,
      authorId: user2.id,
    },
  });

  const docsCommand = await prisma.asset.upsert({
    where: { slug: "readme-generator" },
    update: {},
    create: {
      slug: "readme-generator",
      name: "README Generator",
      description:
        "Generates a comprehensive README.md by analyzing project structure, dependencies, and code patterns.",
      type: "COMMAND",
      primaryPlatform: "GEMINI_CLI",
      compatiblePlatforms: ["CLAUDE_CODE", "CURSOR", "WINDSURF"],
      category: "DOCUMENTATION",
      tags: ["docs", "readme", "markdown"],
      visibility: "PUBLIC",
      license: "MIT",
      storageType: "INLINE",
      content: `# README Generator

Analyze this project and generate a comprehensive README.md that includes:

1. **Project Title & Description** — Clear, concise explanation of what the project does
2. **Installation** — Step-by-step setup instructions based on detected package manager
3. **Usage** — Key commands and examples from package.json scripts
4. **Project Structure** — Directory tree of important folders
5. **Tech Stack** — Detected from dependencies
6. **Contributing** — Standard contributing guidelines
7. **License** — Detected from LICENSE file or package.json
`,
      primaryFileName: "readme-gen.md",
      currentVersion: "1.1.0",
      downloadCount: 56,
      authorId: user2.id,
    },
  });

  const deploySkill = await prisma.asset.upsert({
    where: { slug: "vercel-deploy-helper" },
    update: {},
    create: {
      slug: "vercel-deploy-helper",
      name: "Vercel Deploy Helper",
      description:
        "Skill that guides through Vercel deployment setup, environment variable configuration, and domain management.",
      type: "SKILL",
      primaryPlatform: "CLAUDE_CODE",
      compatiblePlatforms: ["GEMINI_CLI"],
      category: "DEVOPS",
      tags: ["vercel", "deploy", "ci-cd"],
      visibility: "SHARED",
      license: "UNLICENSED",
      storageType: "INLINE",
      content: `# Vercel Deploy Helper

## Steps
1. Check for \`vercel.json\` configuration
2. Validate environment variables against \`.env.example\`
3. Run build locally to catch errors before deploy
4. Execute \`vercel --prod\` with appropriate flags
5. Verify deployment health check
`,
      primaryFileName: "SKILL.md",
      currentVersion: "1.0.0",
      downloadCount: 12,
      authorId: user1.id,
    },
  });

  console.log(
    `Created assets: ${commitSkill.name}, ${reviewCommand.name}, ${testAgent.name}, ${docsCommand.name}, ${deploySkill.name}`
  );

  // Create version records for assets with versions > 1.0.0
  await prisma.assetVersion.createMany({
    data: [
      {
        assetId: commitSkill.id,
        version: "1.0.0",
        changelog: "Initial release with basic commit message generation.",
        content: commitSkill.content,
      },
      {
        assetId: commitSkill.id,
        version: "1.1.0",
        changelog: "Added scope detection from file paths.",
        content: commitSkill.content,
      },
      {
        assetId: commitSkill.id,
        version: "1.2.0",
        changelog: "Improved multi-file change summarization.",
        content: commitSkill.content,
      },
      {
        assetId: testAgent.id,
        version: "1.0.0",
        changelog: "Initial release with basic test generation.",
        content: testAgent.content,
      },
      {
        assetId: testAgent.id,
        version: "2.0.0",
        changelog:
          "Major rewrite: added integration test support, edge case detection, and AAA pattern enforcement.",
        content: testAgent.content,
      },
      {
        assetId: docsCommand.id,
        version: "1.0.0",
        changelog: "Initial release.",
        content: docsCommand.content,
      },
      {
        assetId: docsCommand.id,
        version: "1.1.0",
        changelog: "Added tech stack detection from dependencies.",
        content: docsCommand.content,
      },
    ],
    skipDuplicates: true,
  });

  console.log("Created version records");

  // Create a machine for user1
  await prisma.userMachine.upsert({
    where: {
      userId_machineIdentifier: {
        userId: user1.id,
        machineIdentifier: "work-desktop-001",
      },
    },
    update: {},
    create: {
      userId: user1.id,
      name: "Work Desktop",
      machineIdentifier: "work-desktop-001",
      lastSyncAt: new Date(),
    },
  });

  console.log("Created sample machine");
  console.log("Seed completed!");

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
