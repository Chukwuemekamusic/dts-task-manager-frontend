import { app } from '../../main/app';
import { csrfToken } from '../support/csrf';

import { expect } from 'chai';
import nock from 'nock';
import request from 'supertest';

const BASE = 'http://localhost:4000';

const validForm = {
  title: 'Review bundle',
  description: 'Check pagination',
  status: 'PENDING',
  'dueDate-day': '1',
  'dueDate-month': '6',
  'dueDate-year': '2026',
  dueTime: '17:00',
};

const sampleTask = {
  id: 1,
  title: 'Review bundle for case ABC123',
  description: 'Check exhibits are paginated correctly',
  status: 'PENDING',
  dueDateTime: '2026-06-01T17:00:00Z',
  createdAt: '2026-05-01T09:00:00Z',
  updatedAt: '2026-05-01T09:00:00Z',
};

describe('Task routes', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  describe('GET /', () => {
    test('redirects to /tasks', async () => {
      const res = await request(app).get('/');
      expect(res.status).to.equal(302);
      expect(res.headers.location).to.equal('/tasks');
    });
  });

  describe('GET /tasks', () => {
    test('renders the task list with the task title and status tag', async () => {
      nock(BASE).get('/tasks').reply(200, [sampleTask]);

      const res = await request(app).get('/tasks');

      expect(res.status).to.equal(200);
      expect(res.text).to.contain('Review bundle for case ABC123');
      expect(res.text).to.contain('Pending');
      expect(res.text).to.contain('href="/tasks/1"');
    });

    test('renders a clear empty state when there are no tasks', async () => {
      nock(BASE).get('/tasks').reply(200, []);

      const res = await request(app).get('/tasks');

      expect(res.status).to.equal(200);
      expect(res.text).to.contain('You have no tasks yet');
    });

    test('renders the friendly error page when the backend is unavailable', async () => {
      nock(BASE).get('/tasks').reply(500, {});

      const res = await request(app).get('/tasks');

      expect(res.status).to.equal(500);
      expect(res.text).to.contain('Sorry, there is a problem with the service');
      expect(res.text).to.not.contain('stack');
    });
  });

  describe('GET /tasks/:id', () => {
    test('renders the task details with a back link and action buttons', async () => {
      nock(BASE).get('/tasks/1').reply(200, sampleTask);

      const res = await request(app).get('/tasks/1');

      expect(res.status).to.equal(200);
      expect(res.text).to.contain('Review bundle for case ABC123');
      expect(res.text).to.contain('Check exhibits are paginated correctly');
      expect(res.text).to.contain('Pending');
      expect(res.text).to.contain('href="/tasks"');
      expect(res.text).to.contain('/tasks/1/edit');
      expect(res.text).to.contain('/tasks/1/delete');
    });

    test('renders the not-found page (404) when the task does not exist', async () => {
      nock(BASE).get('/tasks/999').reply(404, { title: 'Task not found', status: 404 });

      const res = await request(app).get('/tasks/999');

      expect(res.status).to.equal(404);
      expect(res.text).to.contain('Page not found');
      expect(res.text).to.not.contain('Sorry, there is a problem with the service');
    });

    test('renders the not-found page for a non-numeric id without calling the backend', async () => {
      const res = await request(app).get('/tasks/not-a-number');

      expect(res.status).to.equal(404);
      expect(res.text).to.contain('Page not found');
    });
  });

  describe('GET /tasks/new', () => {
    test('renders the create form with a CSRF token', async () => {
      const res = await request(app).get('/tasks/new');

      expect(res.status).to.equal(200);
      expect(res.text).to.contain('Create a task');
      expect(res.text).to.contain('name="_csrf"');
      expect(res.text).to.contain('name="dueDate-day"');
      expect(res.text).to.contain('name="status"');
    });
  });

  describe('POST /tasks/new', () => {
    test('creates the task and redirects to its view page on valid input', async () => {
      const created = nock(BASE)
        .post('/tasks', {
          title: 'Review bundle',
          description: 'Check pagination',
          status: 'PENDING',
          dueDateTime: '2026-06-01T17:00:00+01:00',
        })
        .reply(201, { ...sampleTask, id: 7 });

      const agent = request.agent(app);
      const token = await csrfToken(agent, '/tasks/new');
      const res = await agent
        .post('/tasks/new')
        .type('form')
        .send({ _csrf: token, ...validForm });

      expect(res.status).to.equal(302);
      expect(res.headers.location).to.equal('/tasks/7');
      expect(created.isDone()).to.equal(true);
    });

    test('re-renders the form with an error summary and makes no backend call on invalid input', async () => {
      const backend = nock(BASE).post('/tasks').reply(201, sampleTask);

      const agent = request.agent(app);
      const token = await csrfToken(agent, '/tasks/new');
      const res = await agent
        .post('/tasks/new')
        .type('form')
        .send({ _csrf: token, ...validForm, title: '' });

      expect(res.status).to.equal(200);
      expect(res.text).to.contain('There is a problem');
      expect(res.text).to.contain('Error: Create a task');
      expect(res.text).to.contain('Enter a task title');
      expect(backend.isDone()).to.equal(false);
    });

    test('preserves the entered values when validation fails', async () => {
      const agent = request.agent(app);
      const token = await csrfToken(agent, '/tasks/new');
      const res = await agent
        .post('/tasks/new')
        .type('form')
        .send({ _csrf: token, ...validForm, title: '', description: 'Keep me' });

      expect(res.text).to.contain('Keep me');
    });

    test('maps backend 400 validation errors back onto the form', async () => {
      nock(BASE)
        .post('/tasks')
        .reply(400, { status: 400, errors: ['title: must not be blank'] });

      const agent = request.agent(app);
      const token = await csrfToken(agent, '/tasks/new');
      const res = await agent
        .post('/tasks/new')
        .type('form')
        .send({ _csrf: token, ...validForm });

      expect(res.status).to.equal(200);
      expect(res.text).to.contain('There is a problem');
      expect(res.text).to.contain('Must not be blank');
    });

    test('rejects a POST without a CSRF token', async () => {
      const res = await request(app).post('/tasks/new').type('form').send(validForm);

      expect(res.status).to.equal(403);
    });
  });

  describe('GET /tasks/:id/edit', () => {
    test('renders the form pre-filled with the current values', async () => {
      nock(BASE).get('/tasks/1').reply(200, sampleTask);

      const res = await request(app).get('/tasks/1/edit');

      expect(res.status).to.equal(200);
      expect(res.text).to.contain('Edit task');
      expect(res.text).to.contain('value="Review bundle for case ABC123"');
      expect(res.text).to.contain('name="_csrf"');
      // 2026-06-01T17:00:00Z renders as 1 June 18:00 BST.
      expect(res.text).to.contain('value="1"');
      expect(res.text).to.contain('value="18:00"');
    });

    test('renders the not-found page when the task does not exist', async () => {
      nock(BASE).get('/tasks/999').reply(404, { status: 404 });

      const res = await request(app).get('/tasks/999/edit');

      expect(res.status).to.equal(404);
      expect(res.text).to.contain('Page not found');
    });
  });

  describe('POST /tasks/:id/edit', () => {
    test('updates the task and redirects to its view page on valid input', async () => {
      const updated = nock(BASE)
        .put('/tasks/1', {
          title: 'Review bundle',
          description: 'Check pagination',
          status: 'PENDING',
          dueDateTime: '2026-06-01T17:00:00+01:00',
        })
        .reply(200, sampleTask);

      const agent = request.agent(app);
      nock(BASE).get('/tasks/1').reply(200, sampleTask);
      const token = await csrfToken(agent, '/tasks/1/edit');
      const res = await agent
        .post('/tasks/1/edit')
        .type('form')
        .send({ _csrf: token, ...validForm });

      expect(res.status).to.equal(302);
      expect(res.headers.location).to.equal('/tasks/1');
      expect(updated.isDone()).to.equal(true);
    });

    test('re-renders with errors and makes no backend call on invalid input', async () => {
      const backend = nock(BASE).put('/tasks/1').reply(200, sampleTask);

      const agent = request.agent(app);
      nock(BASE).get('/tasks/1').reply(200, sampleTask);
      const token = await csrfToken(agent, '/tasks/1/edit');
      const res = await agent
        .post('/tasks/1/edit')
        .type('form')
        .send({ _csrf: token, ...validForm, title: '' });

      expect(res.status).to.equal(200);
      expect(res.text).to.contain('There is a problem');
      expect(res.text).to.contain('Error: Edit task');
      expect(backend.isDone()).to.equal(false);
    });

    test('renders the not-found page when updating a task that no longer exists', async () => {
      nock(BASE).put('/tasks/999').reply(404, { status: 404 });

      const agent = request.agent(app);
      nock(BASE)
        .get('/tasks/999')
        .reply(200, { ...sampleTask, id: 999 });
      const token = await csrfToken(agent, '/tasks/999/edit');
      const res = await agent
        .post('/tasks/999/edit')
        .type('form')
        .send({ _csrf: token, ...validForm });

      expect(res.status).to.equal(404);
      expect(res.text).to.contain('Page not found');
    });
  });

  describe('POST /tasks/:id/status', () => {
    test('updates the status and redirects to the view page', async () => {
      const patched = nock(BASE).patch('/tasks/1/status', { status: 'COMPLETED' }).reply(200, sampleTask);

      const agent = request.agent(app);
      nock(BASE).get('/tasks/1').reply(200, sampleTask);
      const token = await csrfToken(agent, '/tasks/1');
      const res = await agent.post('/tasks/1/status').type('form').send({ _csrf: token, status: 'COMPLETED' });

      expect(res.status).to.equal(302);
      expect(res.headers.location).to.equal('/tasks/1');
      expect(patched.isDone()).to.equal(true);
    });

    test('rejects an invalid status without calling the backend', async () => {
      const patched = nock(BASE).patch('/tasks/1/status').reply(200, sampleTask);

      const agent = request.agent(app);
      // Two GETs: one to obtain the token, one to re-render the view on error.
      nock(BASE).get('/tasks/1').times(2).reply(200, sampleTask);
      const token = await csrfToken(agent, '/tasks/1');
      const res = await agent.post('/tasks/1/status').type('form').send({ _csrf: token, status: 'BANANA' });

      expect(res.text).to.contain('There is a problem');
      expect(res.text).to.contain('Select a status');
      expect(patched.isDone()).to.equal(false);
    });

    test('renders the not-found page when the task no longer exists', async () => {
      nock(BASE).patch('/tasks/999/status').reply(404, { status: 404 });

      const agent = request.agent(app);
      nock(BASE)
        .get('/tasks/999')
        .reply(200, { ...sampleTask, id: 999 });
      const token = await csrfToken(agent, '/tasks/999');
      const res = await agent.post('/tasks/999/status').type('form').send({ _csrf: token, status: 'COMPLETED' });

      expect(res.status).to.equal(404);
      expect(res.text).to.contain('Page not found');
    });
  });

  describe('GET /tasks/:id/delete', () => {
    test('renders a confirmation page identifying the task with confirm and cancel options', async () => {
      nock(BASE).get('/tasks/1').reply(200, sampleTask);

      const res = await request(app).get('/tasks/1/delete');

      expect(res.status).to.equal(200);
      expect(res.text).to.contain('Are you sure you want to delete this task?');
      expect(res.text).to.contain('Review bundle for case ABC123');
      expect(res.text).to.contain('Delete task');
      expect(res.text).to.contain('href="/tasks/1"');
      expect(res.text).to.contain('name="_csrf"');
    });

    test('renders the not-found page when the task does not exist', async () => {
      nock(BASE).get('/tasks/999').reply(404, { status: 404 });

      const res = await request(app).get('/tasks/999/delete');

      expect(res.status).to.equal(404);
      expect(res.text).to.contain('Page not found');
    });
  });

  describe('POST /tasks/:id/delete', () => {
    test('deletes the task and redirects to the list', async () => {
      const deleted = nock(BASE).delete('/tasks/1').reply(204);

      const agent = request.agent(app);
      nock(BASE).get('/tasks/1').reply(200, sampleTask);
      const token = await csrfToken(agent, '/tasks/1/delete');
      const res = await agent.post('/tasks/1/delete').type('form').send({ _csrf: token });

      expect(res.status).to.equal(302);
      expect(res.headers.location).to.equal('/tasks');
      expect(deleted.isDone()).to.equal(true);
    });

    test('renders the not-found page when deleting a task that no longer exists', async () => {
      nock(BASE).delete('/tasks/999').reply(404, { status: 404 });

      const agent = request.agent(app);
      nock(BASE)
        .get('/tasks/999')
        .reply(200, { ...sampleTask, id: 999 });
      const token = await csrfToken(agent, '/tasks/999/delete');
      const res = await agent.post('/tasks/999/delete').type('form').send({ _csrf: token });

      expect(res.status).to.equal(404);
      expect(res.text).to.contain('Page not found');
    });
  });
});
