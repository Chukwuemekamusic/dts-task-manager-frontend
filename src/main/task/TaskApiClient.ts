import { ApiError, NotFoundError, ValidationApiError } from './errors';
import { Task, TaskInput, TaskStatus } from './types';

import axios, { AxiosInstance, isAxiosError } from 'axios';
import config from 'config';

/**
 * The only place that knows how to talk to the backend Task API. Controllers
 * call typed methods and receive either a typed result or a typed error
 * (`NotFoundError`, `ValidationApiError`, `ApiError`) — raw axios errors and
 * transport detail never leak past this module.
 */
export class TaskApiClient {
  private readonly http: AxiosInstance;

  constructor(http?: AxiosInstance) {
    this.http =
      http ??
      axios.create({
        baseURL: config.get<string>('api.url'),
        timeout: 10_000,
        headers: { 'Content-Type': 'application/json' },
        // Always use Node's HTTP adapter: this is a server-side client, so it
        // must never pick up the browser XHR adapter in a jsdom test env.
        adapter: 'http',
      });
  }

  async list(): Promise<Task[]> {
    return this.request(() => this.http.get<Task[]>('/tasks'));
  }

  async get(id: number): Promise<Task> {
    return this.request(() => this.http.get<Task>(`/tasks/${id}`));
  }

  async create(input: TaskInput): Promise<Task> {
    return this.request(() => this.http.post<Task>('/tasks', input));
  }

  async update(id: number, input: TaskInput): Promise<Task> {
    return this.request(() => this.http.put<Task>(`/tasks/${id}`, input));
  }

  async updateStatus(id: number, status: TaskStatus): Promise<Task> {
    return this.request(() => this.http.patch<Task>(`/tasks/${id}/status`, { status }));
  }

  async remove(id: number): Promise<void> {
    await this.request(() => this.http.delete<void>(`/tasks/${id}`));
  }

  private async request<T>(call: () => Promise<{ data: T }>): Promise<T> {
    try {
      const response = await call();
      return response.data;
    } catch (error) {
      throw this.mapError(error);
    }
  }

  private mapError(error: unknown): Error {
    if (isAxiosError(error) && error.response) {
      const { status, data } = error.response;
      if (status === 404) {
        return new NotFoundError(detailOf(data) ?? 'Task not found');
      }
      if (status === 400) {
        return new ValidationApiError(fieldErrorsOf(data));
      }
    }
    return new ApiError();
  }
}

function detailOf(data: unknown): string | undefined {
  if (data && typeof data === 'object' && typeof (data as { detail?: unknown }).detail === 'string') {
    return (data as { detail: string }).detail;
  }
  return undefined;
}

function fieldErrorsOf(data: unknown): string[] {
  if (data && typeof data === 'object' && Array.isArray((data as { errors?: unknown }).errors)) {
    return (data as { errors: unknown[] }).errors.filter((e): e is string => typeof e === 'string');
  }
  return [];
}

export const taskApiClient = new TaskApiClient();
