import { PrismaClient, UserRole, ArticleStatus } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL_LOCAL ?? process.env.DATABASE_URL,
    },
  },
});

async function main() {
  // Clear existing data
  await prisma.comment.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.article.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  console.log('Creating users...');
  const admin = await prisma.user.create({
    data: {
      login: 'admin',
      password: '$2b$10$YJV.Q1Ky9k8S4C5z7p1p6.Vh8xR9x9Ky8xR9x9Ky8xR9x9Ky8xR9x9',
      role: UserRole.ADMIN,
    },
  });

  const editor = await prisma.user.create({
    data: {
      login: 'editor',
      password: '$2b$10$YJV.Q1Ky9k8S4C5z7p1p6.Vh8xR9x9Ky8xR9x9Ky8xR9x9Ky8xR9x9',
      role: UserRole.EDITOR,
    },
  });

  const viewer = await prisma.user.create({
    data: {
      login: 'viewer',
      password: '$2b$10$YJV.Q1Ky9k8S4C5z7p1p6.Vh8xR9x9Ky8xR9x9Ky8xR9x9Ky8xR9x9',
      role: UserRole.VIEWER,
    },
  });

  console.log('Creating categories...');
  const techCategory = await prisma.category.create({
    data: {
      name: 'Technology',
      description: 'Articles about technology and programming',
    },
  });

  const businessCategory = await prisma.category.create({
    data: {
      name: 'Business',
      description: 'Business and entrepreneurship',
    },
  });

  const scienceCategory = await prisma.category.create({
    data: {
      name: 'Science',
      description: 'Scientific discoveries and research',
    },
  });

  console.log('Creating tags...');
  const tags = await Promise.all([
    prisma.tag.create({ data: { name: 'JavaScript' } }),
    prisma.tag.create({ data: { name: 'TypeScript' } }),
    prisma.tag.create({ data: { name: 'NestJS' } }),
    prisma.tag.create({ data: { name: 'Database' } }),
    prisma.tag.create({ data: { name: 'Tutorial' } }),
  ]);

  console.log('Creating articles...');
  const article1 = await prisma.article.create({
    data: {
      title: 'Getting Started with NestJS',
      content: `NestJS is a progressive Node.js framework for building efficient, reliable, and scalable server-side applications. Built with TypeScript by default, it combines elements of Object-Oriented Programming, Functional Programming, and Functional Reactive Programming.

NestJS is built on top of Express (or optionally Fastify) and provides a robust architecture inspired by Angular. It uses decorators extensively to define controllers, providers, and modules, making the codebase highly readable and maintainable.

Key features of NestJS include dependency injection, modular architecture, built-in support for GraphQL and WebSockets, and first-class TypeScript support. The framework encourages the separation of concerns through its module system, where each module encapsulates a closely related set of capabilities.

Getting started is straightforward: install the CLI with npm install -g @nestjs/cli, scaffold a new project with nest new project-name, and you have a working API in minutes. The CLI generates controllers, services, modules, and more, following best practices automatically.

NestJS also integrates seamlessly with popular databases via TypeORM, Sequelize, Prisma, or Mongoose, making it a complete solution for building production-grade backend applications.`,
      status: ArticleStatus.PUBLISHED,
      authorId: editor.id,
      categoryId: techCategory.id,
      tags: {
        connect: [{ id: tags[2].id }, { id: tags[0].id }],
      },
    },
  });

  const article2 = await prisma.article.create({
    data: {
      title: 'Database Design Best Practices',
      content: `Good database design is the foundation of any high-performance, maintainable application. A poorly designed schema leads to slow queries, data anomalies, and painful migrations down the line.

Normalization is the first principle to understand. By organizing data into related tables and eliminating redundancy, you ensure consistency and reduce storage costs. The three normal forms (1NF, 2NF, 3NF) provide a systematic approach to achieving a clean schema design.

Indexing is equally critical. Every foreign key should be indexed, and columns frequently used in WHERE clauses, ORDER BY, and JOIN conditions are prime candidates for indexes. However, over-indexing hurts write performance, so each index should be justified by actual query patterns.

Choose appropriate data types carefully. Use integer IDs instead of strings where possible, store timestamps in UTC, and avoid storing derived data that can be computed on the fly. Using UUIDs for primary keys adds portability but comes with a slight performance cost on heavily-indexed tables.

Migrations should always be backward-compatible. Adding columns with defaults, avoiding destructive schema changes during zero-downtime deployments, and maintaining a migration history are all essential practices. Tools like Prisma Migrate or Flyway enforce discipline around database versioning.

Finally, always define constraints at the database level: NOT NULL, UNIQUE, CHECK, and foreign key constraints are your last line of defense against bad data, regardless of application-level validation.`,
      status: ArticleStatus.PUBLISHED,
      authorId: editor.id,
      categoryId: techCategory.id,
      tags: {
        connect: [{ id: tags[3].id }, { id: tags[4].id }],
      },
    },
  });

  await prisma.article.create({
    data: {
      title: 'TypeScript Advanced Types',
      content: `TypeScript's type system goes far beyond basic annotations. Mastering advanced types unlocks expressive, self-documenting code that catches entire classes of bugs at compile time.

Generics allow you to write reusable components that work with any type while preserving type information. A simple example is a typed wrapper around fetch: function fetchJson<T>(url: string): Promise<T>. The caller specifies the expected shape, and TypeScript enforces it throughout the call chain.

Union and intersection types model real-world data naturally. A union type string | number accepts either; an intersection type A & B requires both. Discriminated unions with a literal type field are especially powerful for modeling state machines and API responses.

Conditional types enable type-level logic: type IsArray<T> = T extends any[] ? true : false. Combined with infer, they let you extract type information from complex structures. The built-in utility types like Partial<T>, Required<T>, Pick<T, K>, and Omit<T, K> are all implemented using these primitives.

Template literal types, introduced in TypeScript 4.1, allow constructing string types programmatically. This enables precise typing for CSS-in-JS libraries, event emitter systems, and route builders.

Mapped types transform existing types by iterating over their keys. They are the foundation of the utility types and allow building things like a deep readonly version of any object or a version where all values are wrapped in a Promise.`,
      status: ArticleStatus.DRAFT,
      authorId: admin.id,
      categoryId: techCategory.id,
      tags: {
        connect: [{ id: tags[1].id }],
      },
    },
  });

  await prisma.article.create({
    data: {
      title: 'Startup Funding Guide',
      content: `Raising capital is one of the most challenging and consequential decisions a founder makes. Understanding the landscape of funding options helps you choose the right path for your company's stage and goals.

Pre-seed and seed rounds typically involve friends, family, angel investors, and early-stage venture capital firms. At this stage, investors bet on the team and the vision more than the numbers. Valuations are often set by negotiation rather than financial models. Convertible notes and SAFEs (Simple Agreements for Future Equity) are popular instruments because they defer valuation until a priced round.

Series A is the first institutional round, usually raised when the company has demonstrated product-market fit and is ready to scale. Investors at this stage expect a clear revenue model, strong retention metrics, and a credible path to a large market. Typical amounts range from $2M to $15M depending on the sector.

Venture capital funds operate on a portfolio model: most investments will fail, a few will return the fund, and one or two will generate the outsized returns that define the fund's performance. Understanding this dynamic helps you frame your pitch around the "10x return" narrative VCs need to justify the investment.

Bootstrapping remains a viable and often underrated alternative. Many successful companies have been built without external capital, preserving founder equity and maintaining strategic flexibility. The right choice depends on your market's pace and competitive dynamics.

Due diligence is a two-way street. Just as investors scrutinize your company, you should evaluate your potential investors' reputation, portfolio company references, and willingness to support you through difficult times.`,
      status: ArticleStatus.PUBLISHED,
      authorId: editor.id,
      categoryId: businessCategory.id,
      tags: {
        connect: [{ id: tags[4].id }],
      },
    },
  });

  await prisma.article.create({
    data: {
      title: 'Quantum Computing Fundamentals',
      content: `Quantum computing harnesses the principles of quantum mechanics to process information in ways that classical computers fundamentally cannot. While still largely in the research phase, quantum computers are approaching practical utility for specific problem classes.

The qubit is the basic unit of quantum information. Unlike a classical bit that holds either 0 or 1, a qubit exists in a superposition of both states simultaneously until measured. This property allows quantum computers to explore many possible solutions in parallel, providing potential exponential speedups for certain algorithms.

Entanglement is the second key principle. When two qubits become entangled, the state of one instantly influences the other regardless of distance. This property is exploited in quantum communication protocols and underpins the power of multi-qubit operations.

Quantum gates manipulate qubits similarly to how logic gates manipulate classical bits, but with important differences: quantum operations are reversible, and a single gate can act on multiple qubits simultaneously. Common gates include the Hadamard gate (which creates superposition), the CNOT gate (entangles two qubits), and the Toffoli gate (universal for classical computation).

Quantum error correction is the central engineering challenge. Qubits are extremely fragile; environmental noise causes decoherence, collapsing the quantum state. Current noisy intermediate-scale quantum (NISQ) devices have 50-1000 qubits but are error-prone. Fault-tolerant quantum computing requires logical qubits constructed from many physical qubits.

Practical applications include breaking RSA encryption (via Shor's algorithm), optimizing logistics and financial portfolios (via quantum annealing), simulating molecular interactions for drug discovery, and accelerating machine learning training.`,
      status: ArticleStatus.ARCHIVED,
      authorId: admin.id,
      categoryId: scienceCategory.id,
      tags: {
        connect: [{ id: tags[4].id }],
      },
    },
  });

  console.log('Creating comments...');
  await prisma.comment.create({
    data: {
      content: 'Great article! Very helpful for beginners.',
      articleId: article1.id,
      authorId: viewer.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'Could you provide more examples?',
      articleId: article1.id,
      authorId: editor.id,
    },
  });

  await prisma.comment.create({
    data: {
      content: 'Excellent explanation of database design principles.',
      articleId: article2.id,
      authorId: viewer.id,
    },
  });

  console.log('Seed completed successfully!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
