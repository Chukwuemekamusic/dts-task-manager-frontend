# Task Manager — Frontend

A server-rendered web interface that lets a caseworker manage their tasks:
create, view, edit, change status and delete. It is built on the HMCTS frontend
stack (Express + Nunjucks + the [GOV.UK Design System](https://design-system.service.gov.uk/))
so every page is accessible and consistent with other government services.

The frontend holds **no data of its own** — it is a thin, accessible
presentation layer over the Task REST API, which it consumes over HTTP.

## Prerequisites

- **Node.js** — the version pinned in `.nvmrc` (20.x) is recommended; Node 18
  through 24 all work.
- **Yarn** (the repo pins Yarn 3 via the `packageManager` field and uses
  Yarn Plug'n'Play, so no global install is needed — run through `corepack`).
- **The backend Task API running on `http://localhost:4000`** for the app and
  the functional walkthrough. The unit, route and accessibility tests mock the
  API and do **not** need it.

## Getting started

```bash
yarn install        # install dependencies (Plug'n'Play)
yarn webpack        # build assets and copy the GOV.UK templates into the views
yarn start:dev      # start with hot reload on https://localhost:3100
```

`yarn webpack` (or `yarn build`) **must be run before starting the app or
running the route/accessibility tests** — it copies the GOV.UK Nunjucks
templates into `src/main/views/govuk`, which the pages extend. The dev server
uses a self-signed certificate, so your browser will warn on first load.

For a production-style run over plain HTTP:

```bash
yarn build
yarn start          # http://localhost:3100
```

## Configuration

| Setting   | Source                            | Default                 |
| --------- | --------------------------------- | ----------------------- |
| `api.url` | `config/default.json` / `API_URL` | `http://localhost:4000` |

The backend base URL is read from configuration — set the `API_URL` environment
variable to point the app at a different environment. No URL is hard-coded.

## Pages

| Method & path            | Purpose                                                      |
| ------------------------ | ------------------------------------------------------------ |
| `GET /`                  | Redirects to `/tasks`.                                       |
| `GET /tasks`             | Task list (GOV.UK table; status tag; due date; row links).   |
| `GET /tasks/new`         | Create-task form.                                            |
| `POST /tasks/new`        | Validate and create, then go to the new task.                |
| `GET /tasks/:id`         | Task details, with change-status, edit and delete actions.   |
| `POST /tasks/:id/status` | Quick status change (backend `PATCH`).                       |
| `GET /tasks/:id/edit`    | Edit form, pre-filled with the current values.               |
| `POST /tasks/:id/edit`   | Validate and replace the task (backend `PUT`).               |
| `GET /tasks/:id/delete`  | Delete confirmation page.                                    |
| `POST /tasks/:id/delete` | Delete the task (backend `DELETE`), then return to the list. |
| `GET /health`            | Health check for monitoring.                                 |

## Architecture

- **Thin controllers, one deep HTTP module.** Route handlers parse input, call
  the API client and render a view. All backend communication lives in
  `src/main/task/TaskApiClient.ts`, which maps responses to typed outcomes
  (`NotFoundError`, `ValidationApiError`, `ApiError`) and never leaks transport
  detail to controllers or users.
- **Form mapping/validation** lives in `src/main/task/form.ts`. It mirrors the
  backend rules, combines the day/month/year + time fields into an ISO-8601
  timestamp (entered in Europe/London, sent with the correct offset), and maps
  any backend validation errors back onto the form fields.
- **Browser → server uses GET/POST only; server → backend uses the full verbs.**
  Each form POSTs to an Express route which calls the appropriate backend verb.
- **Security:** every state-changing form is protected with a CSRF token; an
  invalid token returns a 403 page. Backend errors render a friendly page with
  no internal detail.

## Testing

```bash
yarn lint           # stylelint + eslint + prettier
yarn test:unit      # TaskApiClient + form validation (mocked with nock)
yarn test:routes    # route/controller tests (supertest + nock)
yarn test:a11y      # accessibility checks (jest-axe) on every page
yarn cichecks       # install + build + lint + all of the above
```

Run `yarn webpack` before the route and accessibility tests so the GOV.UK
templates are present. None of these suites require the backend to be running.
