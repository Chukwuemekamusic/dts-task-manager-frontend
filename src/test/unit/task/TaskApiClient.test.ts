import { TaskApiClient } from '../../../main/task/TaskApiClient';
import { ApiError, NotFoundError, ValidationApiError } from '../../../main/task/errors';
import { Task, TaskInput } from '../../../main/task/types';
import { expectRejection } from '../../support/expectRejection';

import { expect } from 'chai';
import nock from 'nock';

const BASE = 'http://localhost:4000';

const sampleTask: Task = {
  id: 1,
  title: 'Review bundle for case ABC123',
  description: 'Check exhibits are paginated correctly',
  status: 'PENDING',
  dueDateTime: '2026-06-01T17:00:00Z',
  createdAt: '2026-05-01T09:00:00Z',
  updatedAt: '2026-05-01T09:00:00Z',
};

describe('TaskApiClient', () => {
  let client: TaskApiClient;

  beforeEach(() => {
    client = new TaskApiClient();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('list', () => {
    test('requests GET /tasks and returns the typed tasks', async () => {
      nock(BASE).get('/tasks').reply(200, [sampleTask]);

      const result = await client.list();

      expect(result).to.deep.equal([sampleTask]);
    });

    test('maps a backend 5xx to ApiError', async () => {
      nock(BASE).get('/tasks').reply(500, { detail: 'kaboom' });

      await expectRejection(client.list(), ApiError);
    });

    test('maps a network failure to ApiError', async () => {
      nock(BASE).get('/tasks').replyWithError('ECONNREFUSED');

      await expectRejection(client.list(), ApiError);
    });
  });

  describe('get', () => {
    test('requests GET /tasks/:id and returns the typed task', async () => {
      nock(BASE).get('/tasks/1').reply(200, sampleTask);

      const result = await client.get(1);

      expect(result).to.deep.equal(sampleTask);
    });

    test('maps a backend 404 to NotFoundError', async () => {
      nock(BASE).get('/tasks/999').reply(404, {
        title: 'Task not found',
        status: 404,
        detail: 'Task not found with id: 999',
      });

      await expectRejection(client.get(999), NotFoundError);
    });

    test('maps a backend 5xx to ApiError', async () => {
      nock(BASE).get('/tasks/1').reply(503, {});

      await expectRejection(client.get(1), ApiError);
    });
  });

  describe('create', () => {
    const input: TaskInput = {
      title: 'Review bundle',
      description: 'Check pagination',
      status: 'PENDING',
      dueDateTime: '2026-06-01T17:00:00+01:00',
    };

    test('POSTs the input to /tasks and returns the created task', async () => {
      nock(BASE)
        .post('/tasks', {
          title: 'Review bundle',
          description: 'Check pagination',
          status: 'PENDING',
          dueDateTime: '2026-06-01T17:00:00+01:00',
        })
        .reply(201, { ...sampleTask, ...input });

      const result = await client.create(input);

      expect(result.id).to.equal(sampleTask.id);
      expect(result.title).to.equal('Review bundle');
    });

    test('maps a backend 400 to ValidationApiError carrying the field errors', async () => {
      nock(BASE)
        .post('/tasks')
        .reply(400, { title: 'Validation error', status: 400, errors: ['title: must not be blank'] });

      const error = await expectRejection(client.create(input), ValidationApiError);
      expect(error.errors).to.deep.equal(['title: must not be blank']);
    });
  });

  describe('update', () => {
    const input: TaskInput = {
      title: 'Updated title',
      status: 'COMPLETED',
      dueDateTime: '2026-06-01T17:00:00+01:00',
    };

    test('PUTs the input to /tasks/:id and returns the updated task', async () => {
      nock(BASE)
        .put('/tasks/1', {
          title: 'Updated title',
          status: 'COMPLETED',
          dueDateTime: '2026-06-01T17:00:00+01:00',
        })
        .reply(200, { ...sampleTask, ...input });

      const result = await client.update(1, input);

      expect(result.title).to.equal('Updated title');
      expect(result.status).to.equal('COMPLETED');
    });

    test('maps a backend 404 to NotFoundError', async () => {
      nock(BASE).put('/tasks/999').reply(404, { status: 404, detail: 'Task not found with id: 999' });

      await expectRejection(client.update(999, input), NotFoundError);
    });

    test('maps a backend 400 to ValidationApiError', async () => {
      nock(BASE)
        .put('/tasks/1')
        .reply(400, { status: 400, errors: ['title: must not be blank'] });

      const error = await expectRejection(client.update(1, input), ValidationApiError);
      expect(error.errors).to.deep.equal(['title: must not be blank']);
    });
  });

  describe('updateStatus', () => {
    test('PATCHes the new status to /tasks/:id/status and returns the updated task', async () => {
      nock(BASE)
        .patch('/tasks/1/status', { status: 'COMPLETED' })
        .reply(200, { ...sampleTask, status: 'COMPLETED' });

      const result = await client.updateStatus(1, 'COMPLETED');

      expect(result.status).to.equal('COMPLETED');
    });

    test('maps a backend 404 to NotFoundError', async () => {
      nock(BASE).patch('/tasks/999/status').reply(404, { status: 404 });

      await expectRejection(client.updateStatus(999, 'COMPLETED'), NotFoundError);
    });
  });

  describe('remove', () => {
    test('DELETEs /tasks/:id and resolves on 204', async () => {
      const scope = nock(BASE).delete('/tasks/1').reply(204);

      await client.remove(1);

      expect(scope.isDone()).to.equal(true);
    });

    test('maps a backend 404 to NotFoundError', async () => {
      nock(BASE).delete('/tasks/999').reply(404, { status: 404 });

      await expectRejection(client.remove(999), NotFoundError);
    });
  });
});
