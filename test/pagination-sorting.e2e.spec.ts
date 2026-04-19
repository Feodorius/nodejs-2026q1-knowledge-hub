import { StatusCodes } from 'http-status-codes';
import { request } from './lib';
import { articlesRoutes } from './endpoints';
import { getTokenAndUserId, removeTokenUser, shouldAuthorizationBeTested } from './utils';

describe('Pagination and Sorting (e2e)', () => {
  const req = request;
  const commonHeaders = { Accept: 'application/json' };
  const createdIds: string[] = [];
  let mockUserId: string | undefined;

  beforeAll(async () => {
    if (shouldAuthorizationBeTested) {
      const result = await getTokenAndUserId(req);
      commonHeaders['Authorization'] = result.token;
      mockUserId = result.mockUserId;
    }

    const articles = [
      { title: 'Alpha', content: 'Content A', status: 'draft' },
      { title: 'Beta', content: 'Content B', status: 'published' },
      { title: 'Gamma', content: 'Content C', status: 'draft' },
      { title: 'Delta', content: 'Content D', status: 'published' },
      { title: 'Epsilon', content: 'Content E', status: 'archived' },
    ];

    for (const dto of articles) {
      const res = await req
        .post(articlesRoutes.create)
        .set(commonHeaders)
        .send({ ...dto, authorId: null, categoryId: null, tags: [] });

      expect(res.status).toBe(StatusCodes.CREATED);
      createdIds.push(res.body.id);
    }
  });

  afterAll(async () => {
    for (const id of createdIds) {
      await req.delete(articlesRoutes.delete(id)).set(commonHeaders);
    }

    if (mockUserId) {
      await removeTokenUser(req, mockUserId, commonHeaders);
    }

    if (commonHeaders['Authorization']) {
      delete commonHeaders['Authorization'];
    }
  });

  describe('Pagination', () => {
    it('should return paginated response with total, page, limit, data when page and limit provided', async () => {
      const res = await req
        .get(`${articlesRoutes.getAll}?page=1&limit=2`)
        .set(commonHeaders);

      expect(res.status).toBe(StatusCodes.OK);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('page', 1);
      expect(res.body).toHaveProperty('limit', 2);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeLessThanOrEqual(2);
    });

    it('should return correct page slice', async () => {
      const page1 = await req
        .get(`${articlesRoutes.getAll}?page=1&limit=2`)
        .set(commonHeaders);

      const page2 = await req
        .get(`${articlesRoutes.getAll}?page=2&limit=2`)
        .set(commonHeaders);

      expect(page1.status).toBe(StatusCodes.OK);
      expect(page2.status).toBe(StatusCodes.OK);

      const ids1 = page1.body.data.map((a) => a.id);
      const ids2 = page2.body.data.map((a) => a.id);

      // Pages should not overlap
      const overlap = ids1.filter((id) => ids2.includes(id));
      expect(overlap.length).toBe(0);
    });

    it('should return plain array when no pagination params provided', async () => {
      const res = await req
        .get(articlesRoutes.getAll)
        .set(commonHeaders);

      expect(res.status).toBe(StatusCodes.OK);
      expect(res.body).toBeInstanceOf(Array);
    });
  });

  describe('Sorting', () => {
    it('should sort articles by title ascending', async () => {
      const res = await req
        .get(`${articlesRoutes.getAll}?sortBy=title&order=asc`)
        .set(commonHeaders);

      expect(res.status).toBe(StatusCodes.OK);
      expect(res.body).toBeInstanceOf(Array);

      const titles = res.body.map((a) => a.title);
      const sorted = [...titles].sort();
      expect(titles).toEqual(sorted);
    });

    it('should sort articles by title descending', async () => {
      const res = await req
        .get(`${articlesRoutes.getAll}?sortBy=title&order=desc`)
        .set(commonHeaders);

      expect(res.status).toBe(StatusCodes.OK);
      expect(res.body).toBeInstanceOf(Array);

      const titles = res.body.map((a) => a.title);
      const sorted = [...titles].sort().reverse();
      expect(titles).toEqual(sorted);
    });

    it('should combine sorting with pagination', async () => {
      const res = await req
        .get(`${articlesRoutes.getAll}?sortBy=title&order=asc&page=1&limit=3`)
        .set(commonHeaders);

      expect(res.status).toBe(StatusCodes.OK);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data.length).toBeLessThanOrEqual(3);

      const titles = res.body.data.map((a) => a.title);
      const sorted = [...titles].sort();
      expect(titles).toEqual(sorted);
    });
  });
});
