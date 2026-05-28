import {
  TaskFormValues,
  extractFormValues,
  mapApiErrors,
  toErrorView,
  validateTaskForm,
  valuesFromTask,
} from '../../../main/task/form';
import { Task } from '../../../main/task/types';

import { expect } from 'chai';

function validValues(overrides: Partial<TaskFormValues> = {}): TaskFormValues {
  return {
    title: 'Review bundle',
    description: 'Check pagination',
    status: 'PENDING',
    'dueDate-day': '1',
    'dueDate-month': '6',
    'dueDate-year': '2026',
    dueTime: '17:00',
    ...overrides,
  };
}

describe('validateTaskForm', () => {
  test('accepts valid values and combines the due date/time into an ISO timestamp', () => {
    const { input, errors } = validateTaskForm(validValues());

    expect(errors).to.have.lengthOf(0);
    expect(input).to.deep.equal({
      title: 'Review bundle',
      description: 'Check pagination',
      status: 'PENDING',
      // 1 June is BST (+01:00) in Europe/London.
      dueDateTime: '2026-06-01T17:00:00+01:00',
    });
  });

  test('uses a +00:00 (Z) offset for a winter (GMT) date', () => {
    const { input } = validateTaskForm(validValues({ 'dueDate-month': '1', dueTime: '09:30' }));

    expect(input?.dueDateTime).to.equal('2026-01-01T09:30:00Z');
  });

  test('treats an empty description as undefined', () => {
    const { input } = validateTaskForm(validValues({ description: '' }));

    expect(input?.description).to.equal(undefined);
  });

  test('requires a title', () => {
    const { input, errors } = validateTaskForm(validValues({ title: '   ' }));

    expect(input).to.equal(undefined);
    expect(errors.map(e => e.field)).to.include('title');
  });

  test('rejects a title longer than 255 characters', () => {
    const { errors } = validateTaskForm(validValues({ title: 'a'.repeat(256) }));

    expect(errors.map(e => e.field)).to.include('title');
  });

  test('rejects a description longer than 2000 characters', () => {
    const { errors } = validateTaskForm(validValues({ description: 'a'.repeat(2001) }));

    expect(errors.map(e => e.field)).to.include('description');
  });

  test('rejects an invalid status', () => {
    const { errors } = validateTaskForm(validValues({ status: 'BANANA' }));

    expect(errors.map(e => e.field)).to.include('status');
  });

  test('rejects an impossible date such as 31 February', () => {
    const { errors } = validateTaskForm(validValues({ 'dueDate-day': '31', 'dueDate-month': '2' }));

    expect(errors.map(e => e.field)).to.include('dueDate');
  });

  test('requires a due date when all date fields are empty', () => {
    const { errors } = validateTaskForm(validValues({ 'dueDate-day': '', 'dueDate-month': '', 'dueDate-year': '' }));

    expect(errors.map(e => e.field)).to.include('dueDate');
  });

  test('rejects an out-of-range time', () => {
    const { errors } = validateTaskForm(validValues({ dueTime: '25:00' }));

    expect(errors.map(e => e.field)).to.include('dueTime');
  });
});

describe('valuesFromTask', () => {
  test('splits a stored ISO timestamp back into Europe/London form fields', () => {
    const task: Task = {
      id: 1,
      title: 'Review bundle',
      description: 'Check pagination',
      status: 'IN_PROGRESS',
      dueDateTime: '2026-06-01T16:00:00Z', // 17:00 BST
      createdAt: '2026-05-01T09:00:00Z',
      updatedAt: '2026-05-01T09:00:00Z',
    };

    expect(valuesFromTask(task)).to.deep.equal({
      title: 'Review bundle',
      description: 'Check pagination',
      status: 'IN_PROGRESS',
      'dueDate-day': '1',
      'dueDate-month': '6',
      'dueDate-year': '2026',
      dueTime: '17:00',
    });
  });
});

describe('mapApiErrors', () => {
  test('maps backend field errors onto form fields (dueDateTime -> dueDate)', () => {
    const errors = mapApiErrors(['title: must not be blank', 'dueDateTime: is required']);

    expect(errors).to.deep.include({ field: 'title', message: 'Must not be blank', href: '#title' });
    expect(errors).to.deep.include({ field: 'dueDate', message: 'Is required', href: '#dueDate-day' });
  });
});

describe('toErrorView', () => {
  test('builds a summary list and an inline field map', () => {
    const view = toErrorView([{ field: 'title', message: 'Enter a task title', href: '#title' }]);

    expect(view.list).to.deep.equal([{ text: 'Enter a task title', href: '#title' }]);
    expect(view.fields.title).to.deep.equal({ text: 'Enter a task title' });
  });
});

describe('extractFormValues', () => {
  test('reads and trims the posted fields, defaulting missing ones to empty strings', () => {
    const values = extractFormValues({ title: '  Hello  ', 'dueDate-day': '1' });

    expect(values.title).to.equal('Hello');
    expect(values['dueDate-day']).to.equal('1');
    expect(values.dueTime).to.equal('');
  });
});
