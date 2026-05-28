import { Task, TaskInput, TaskStatus, isTaskStatus } from './types';

/**
 * The raw string values of the task form, keyed by the field names the GOV.UK
 * components post. Echoed straight back to the template so a failed submission
 * keeps everything the user typed.
 */
export interface TaskFormValues {
  title: string;
  description: string;
  status: string;
  'dueDate-day': string;
  'dueDate-month': string;
  'dueDate-year': string;
  dueTime: string;
}

export interface FieldError {
  field: string;
  message: string;
  href: string;
}

/** Shape the template consumes: an ordered list for the summary, a map for inline messages. */
export interface ErrorView {
  list: { text: string; href: string }[];
  fields: Record<string, { text: string }>;
}

const FIELD_HREF: Record<string, string> = {
  title: '#title',
  description: '#description',
  status: '#status',
  dueDate: '#dueDate-day',
  dueTime: '#dueTime',
};

// Backend (TaskRequest) field name -> form field name.
const BACKEND_FIELD: Record<string, string> = {
  title: 'title',
  description: 'description',
  status: 'status',
  dueDateTime: 'dueDate',
};

const EMPTY_VALUES: TaskFormValues = {
  title: '',
  description: '',
  status: '',
  'dueDate-day': '',
  'dueDate-month': '',
  'dueDate-year': '',
  dueTime: '',
};

export function emptyFormValues(): TaskFormValues {
  return { ...EMPTY_VALUES };
}

/** Pulls the task form fields out of a posted request body as trimmed strings. */
export function extractFormValues(body: Record<string, unknown>): TaskFormValues {
  const str = (key: string): string => (body[key] === undefined || body[key] === null ? '' : String(body[key]).trim());
  return {
    title: str('title'),
    description: str('description'),
    status: str('status'),
    'dueDate-day': str('dueDate-day'),
    'dueDate-month': str('dueDate-month'),
    'dueDate-year': str('dueDate-year'),
    dueTime: str('dueTime'),
  };
}

/** Splits a stored task back into form values (in Europe/London terms) for pre-filling the edit form. */
export function valuesFromTask(task: Task): TaskFormValues {
  const { year, month, day, hour, minute } = londonParts(task.dueDateTime);
  return {
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    'dueDate-day': String(Number(day)),
    'dueDate-month': String(Number(month)),
    'dueDate-year': year,
    dueTime: `${hour}:${minute}`,
  };
}

/**
 * Validates the form mirroring the backend rules and, when valid, returns the
 * `TaskInput` ready to send (due date/time combined into an ISO-8601 timestamp
 * with the Europe/London offset).
 */
export function validateTaskForm(values: TaskFormValues): { input?: TaskInput; errors: FieldError[] } {
  const errors: FieldError[] = [];

  const title = values.title.trim();
  if (!title) {
    addError(errors, 'title', 'Enter a task title');
  } else if (title.length > 255) {
    addError(errors, 'title', 'Task title must be 255 characters or fewer');
  }

  const description = values.description.trim();
  if (description.length > 2000) {
    addError(errors, 'description', 'Task description must be 2,000 characters or fewer');
  }

  const status = values.status.trim();
  if (!status) {
    addError(errors, 'status', 'Select a status');
  } else if (!isTaskStatus(status)) {
    addError(errors, 'status', 'Select a valid status');
  }

  const dueDateTime = validateDueDateTime(values, errors);

  if (errors.length > 0) {
    return { errors };
  }

  return {
    errors: [],
    input: {
      title,
      description: description || undefined,
      status: status as TaskStatus,
      dueDateTime: dueDateTime as string,
    },
  };
}

/** Maps a backend validation error list (`"field: message"`) back onto form fields. */
export function mapApiErrors(apiErrors: string[]): FieldError[] {
  return apiErrors.map(raw => {
    const separator = raw.indexOf(':');
    const backendField = separator >= 0 ? raw.slice(0, separator).trim() : raw.trim();
    const message = separator >= 0 ? raw.slice(separator + 1).trim() : raw.trim();
    const field = BACKEND_FIELD[backendField] ?? backendField;
    return makeError(field, capitalise(message) || 'Invalid value');
  });
}

export function toErrorView(errors: FieldError[]): ErrorView {
  const fields: Record<string, { text: string }> = {};
  for (const error of errors) {
    if (!fields[error.field]) {
      fields[error.field] = { text: error.message };
    }
  }
  return {
    list: errors.map(error => ({ text: error.message, href: error.href })),
    fields,
  };
}

function validateDueDateTime(values: TaskFormValues, errors: FieldError[]): string | undefined {
  const day = values['dueDate-day'].trim();
  const month = values['dueDate-month'].trim();
  const year = values['dueDate-year'].trim();
  const time = values.dueTime.trim();

  let parsedDate: { y: number; m: number; d: number } | undefined;
  if (!day && !month && !year) {
    addError(errors, 'dueDate', 'Enter a due date');
  } else if (!isInteger(day) || !isInteger(month) || !isInteger(year)) {
    addError(errors, 'dueDate', 'Due date must be a real date');
  } else if (!isRealDate(Number(year), Number(month), Number(day))) {
    addError(errors, 'dueDate', 'Due date must be a real date');
  } else {
    parsedDate = { y: Number(year), m: Number(month), d: Number(day) };
  }

  let parsedTime: { h: number; min: number } | undefined;
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!time) {
    addError(errors, 'dueTime', 'Enter a due time');
  } else if (!timeMatch || Number(timeMatch[1]) > 23 || Number(timeMatch[2]) > 59) {
    addError(errors, 'dueTime', 'Enter a due time in the correct format, for example 09:30');
  } else {
    parsedTime = { h: Number(timeMatch[1]), min: Number(timeMatch[2]) };
  }

  if (parsedDate && parsedTime) {
    return toLondonIso(parsedDate.y, parsedDate.m, parsedDate.d, parsedTime.h, parsedTime.min);
  }
  return undefined;
}

function isInteger(value: string): boolean {
  return /^\d+$/.test(value);
}

function isRealDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1) {
    return false;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Builds an ISO-8601 timestamp for a Europe/London wall-clock time, with the correct offset. */
function toLondonIso(year: number, month: number, day: number, hour: number, minute: number): string {
  const wallAsUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  // Refine once so a wall time that lands on a DST transition resolves correctly.
  const firstGuess = londonOffsetMillis(wallAsUtc);
  const offsetMillis = londonOffsetMillis(wallAsUtc - firstGuess);
  return (
    `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}` +
    `T${pad(hour, 2)}:${pad(minute, 2)}:00${formatOffset(offsetMillis)}`
  );
}

function londonOffsetMillis(instant: number): number {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    timeZoneName: 'longOffset',
  });
  const name = formatter.formatToParts(new Date(instant)).find(part => part.type === 'timeZoneName')?.value ?? 'GMT';
  const match = /GMT([+-])(\d{2}):?(\d{2})?/.exec(name);
  if (!match) {
    return 0;
  }
  const sign = match[1] === '-' ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? '0');
  return sign * (hours * 60 + minutes) * 60_000;
}

function formatOffset(offsetMillis: number): string {
  if (offsetMillis === 0) {
    return 'Z';
  }
  const sign = offsetMillis > 0 ? '+' : '-';
  const totalMinutes = Math.abs(offsetMillis) / 60_000;
  return `${sign}${pad(Math.floor(totalMinutes / 60), 2)}:${pad(totalMinutes % 60, 2)}`;
}

function londonParts(iso: string): { year: string; month: string; day: string; hour: string; minute: string } {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date(iso));
  const get = (type: string): string => parts.find(part => part.type === type)?.value ?? '';
  const hour = get('hour') === '24' ? '00' : get('hour');
  return { year: get('year'), month: get('month'), day: get('day'), hour, minute: get('minute') };
}

function pad(value: number, length: number): string {
  return String(value).padStart(length, '0');
}

function capitalise(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function makeError(field: string, message: string): FieldError {
  return { field, message, href: FIELD_HREF[field] ?? `#${field}` };
}

function addError(errors: FieldError[], field: string, message: string): void {
  errors.push(makeError(field, message));
}
