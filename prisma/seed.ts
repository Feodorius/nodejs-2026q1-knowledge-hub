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
      content:
        'NestJS is a progressive Node.js framework for building efficient, reliable and scalable server-side applications.',
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
      content:
        'Learn how to design efficient databases with proper schema design and indexing strategies.',
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
      content:
        'Master TypeScript advanced type system including generics, unions, and conditional types.',
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
      content:
        'A comprehensive guide to understanding venture capital, angel investments, and funding rounds.',
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
      content:
        'Introduction to quantum computing, qubits, and quantum algorithms that will revolutionize computing.',
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
