import { app } from '../../main/app';
import { axeOptions, stripAssets } from '../support/a11y';
import { csrfToken } from '../support/csrf';

import { axe } from 'jest-axe';
import nock from 'nock';
import request from 'supertest';

const BASE = 'http://localhost:4000';

const sampleTask = {
  id: 1,
  title: 'Review bundle for case ABC123',
  description: 'Check exhibits are paginated correctly',
  status: 'PENDING',
  dueDateTime: '2026-06-01T17:00:00Z',
  createdAt: '2026-05-01T09:00:00Z',
  updatedAt: '2026-05-01T09:00:00Z',
};

describe('Accessibility', () => {
  afterEach(() => {
    nock.cleanAll();
  });

  test('the task list page has no accessibility violations', async () => {
    nock(BASE).get('/tasks').reply(200, [sampleTask]);

    const res = await request(app).get('/tasks');
    expect(res.text).toContain('Review bundle for case ABC123');

    const results = await axe(stripAssets(res.text), axeOptions);
    expect(results).toHaveNoViolations();
  });

  test('the task view page has no accessibility violations', async () => {
    nock(BASE).get('/tasks/1').reply(200, sampleTask);

    const res = await request(app).get('/tasks/1');
    expect(res.text).toContain('Review bundle for case ABC123');

    const results = await axe(stripAssets(res.text), axeOptions);
    expect(results).toHaveNoViolations();
  });

  test('the create form has no accessibility violations', async () => {
    const res = await request(app).get('/tasks/new');
    expect(res.text).toContain('Create a task');

    const results = await axe(stripAssets(res.text), axeOptions);
    expect(results).toHaveNoViolations();
  });

  test('the create form with validation errors has no accessibility violations', async () => {
    const agent = request.agent(app);
    const token = await csrfToken(agent, '/tasks/new');
    const res = await agent.post('/tasks/new').type('form').send({ _csrf: token, title: '' });
    expect(res.text).toContain('There is a problem');

    const results = await axe(stripAssets(res.text), axeOptions);
    expect(results).toHaveNoViolations();
  });

  test('the edit form has no accessibility violations', async () => {
    nock(BASE).get('/tasks/1').reply(200, sampleTask);

    const res = await request(app).get('/tasks/1/edit');
    expect(res.text).toContain('Edit task');

    const results = await axe(stripAssets(res.text), axeOptions);
    expect(results).toHaveNoViolations();
  });

  test('the view page with a status error has no accessibility violations', async () => {
    const agent = request.agent(app);
    nock(BASE).get('/tasks/1').times(2).reply(200, sampleTask);
    const token = await csrfToken(agent, '/tasks/1');
    const res = await agent.post('/tasks/1/status').type('form').send({ _csrf: token, status: 'BANANA' });
    expect(res.text).toContain('There is a problem');

    const results = await axe(stripAssets(res.text), axeOptions);
    expect(results).toHaveNoViolations();
  });

  test('the delete confirmation page has no accessibility violations', async () => {
    nock(BASE).get('/tasks/1').reply(200, sampleTask);

    const res = await request(app).get('/tasks/1/delete');
    expect(res.text).toContain('Are you sure you want to delete this task?');

    const results = await axe(stripAssets(res.text), axeOptions);
    expect(results).toHaveNoViolations();
  });
});
