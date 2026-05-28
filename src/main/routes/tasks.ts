import { taskApiClient } from '../task/TaskApiClient';
import { NotFoundError, ValidationApiError } from '../task/errors';
import {
  emptyFormValues,
  extractFormValues,
  mapApiErrors,
  toErrorView,
  validateTaskForm,
  valuesFromTask,
} from '../task/form';
import { isTaskStatus } from '../task/types';

import { Application, Request, Response } from 'express';

const CREATE_FORM = {
  pageHeading: 'Create a task',
  submitText: 'Create task',
  formAction: '/tasks/new',
  backText: 'Back to tasks',
  backHref: '/tasks',
};

export default function (app: Application): void {
  app.get('/', (req, res) => {
    res.redirect('/tasks');
  });

  app.get('/tasks', async (req, res, next) => {
    try {
      const tasks = await taskApiClient.list();
      tasks.sort((a, b) => a.dueDateTime.localeCompare(b.dueDateTime));
      res.render('tasks/list', { tasks });
    } catch (error) {
      next(error);
    }
  });

  app.get('/tasks/new', (req, res) => {
    res.render('tasks/form', { ...CREATE_FORM, values: emptyFormValues(), errors: toErrorView([]) });
  });

  app.post('/tasks/new', async (req, res, next) => {
    const values = extractFormValues(req.body);
    const { input, errors } = validateTaskForm(values);
    if (!input) {
      res.render('tasks/form', { ...CREATE_FORM, values, errors: toErrorView(errors) });
      return;
    }
    try {
      const task = await taskApiClient.create(input);
      res.redirect(`/tasks/${task.id}`);
    } catch (error) {
      if (error instanceof ValidationApiError) {
        res.render('tasks/form', { ...CREATE_FORM, values, errors: toErrorView(mapApiErrors(error.errors)) });
        return;
      }
      next(error);
    }
  });

  app.get('/tasks/:id', async (req, res, next) => {
    const id = taskId(req, res);
    if (id === undefined) {
      return;
    }
    try {
      const task = await taskApiClient.get(id);
      res.render('tasks/view', { task, errors: toErrorView([]) });
    } catch (error) {
      handleTaskError(error, res, next);
    }
  });

  app.post('/tasks/:id/status', async (req, res, next) => {
    const id = taskId(req, res);
    if (id === undefined) {
      return;
    }
    const status = typeof req.body.status === 'string' ? req.body.status.trim() : '';
    try {
      if (!isTaskStatus(status)) {
        const task = await taskApiClient.get(id);
        const errors = toErrorView([{ field: 'status', message: 'Select a status', href: '#status' }]);
        res.render('tasks/view', { task, errors });
        return;
      }
      await taskApiClient.updateStatus(id, status);
      res.redirect(`/tasks/${id}`);
    } catch (error) {
      handleTaskError(error, res, next);
    }
  });

  app.get('/tasks/:id/edit', async (req, res, next) => {
    const id = taskId(req, res);
    if (id === undefined) {
      return;
    }
    try {
      const task = await taskApiClient.get(id);
      res.render('tasks/form', { ...editForm(id), values: valuesFromTask(task), errors: toErrorView([]) });
    } catch (error) {
      handleTaskError(error, res, next);
    }
  });

  app.post('/tasks/:id/edit', async (req, res, next) => {
    const id = taskId(req, res);
    if (id === undefined) {
      return;
    }
    const values = extractFormValues(req.body);
    const { input, errors } = validateTaskForm(values);
    if (!input) {
      res.render('tasks/form', { ...editForm(id), values, errors: toErrorView(errors) });
      return;
    }
    try {
      await taskApiClient.update(id, input);
      res.redirect(`/tasks/${id}`);
    } catch (error) {
      if (error instanceof ValidationApiError) {
        res.render('tasks/form', { ...editForm(id), values, errors: toErrorView(mapApiErrors(error.errors)) });
        return;
      }
      handleTaskError(error, res, next);
    }
  });

  app.get('/tasks/:id/delete', async (req, res, next) => {
    const id = taskId(req, res);
    if (id === undefined) {
      return;
    }
    try {
      const task = await taskApiClient.get(id);
      res.render('tasks/delete', { task });
    } catch (error) {
      handleTaskError(error, res, next);
    }
  });

  app.post('/tasks/:id/delete', async (req, res, next) => {
    const id = taskId(req, res);
    if (id === undefined) {
      return;
    }
    try {
      await taskApiClient.remove(id);
      res.redirect('/tasks');
    } catch (error) {
      handleTaskError(error, res, next);
    }
  });
}

function editForm(id: number): {
  pageHeading: string;
  submitText: string;
  formAction: string;
  backText: string;
  backHref: string;
} {
  return {
    pageHeading: 'Edit task',
    submitText: 'Save changes',
    formAction: `/tasks/${id}/edit`,
    backText: 'Back to task',
    backHref: `/tasks/${id}`,
  };
}

/**
 * Parses the `:id` path param as a positive integer. Renders the not-found page
 * and returns `undefined` for anything else, so a junk id never reaches the
 * backend as a malformed request.
 */
function taskId(req: Request, res: Response): number | undefined {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    res.status(404).render('not-found');
    return undefined;
  }
  return id;
}

/** A backend 404 is a "not found" page; anything else is the generic error. */
function handleTaskError(error: unknown, res: Response, next: (err: unknown) => void): void {
  if (error instanceof NotFoundError) {
    res.status(404).render('not-found');
    return;
  }
  next(error);
}
