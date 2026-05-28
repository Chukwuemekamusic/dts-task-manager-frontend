import * as path from 'path';

import { HTTPError } from './HttpError';
import { Nunjucks } from './modules/nunjucks';

import * as bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import csrf from 'csurf';
import express from 'express';
import { glob } from 'glob';
import favicon from 'serve-favicon';

const { setupDev } = require('./development');

const env = process.env.NODE_ENV || 'development';
const developmentMode = env === 'development';

export const app = express();
app.locals.ENV = env;

new Nunjucks(developmentMode).enableFor(app);

app.use(favicon(path.join(__dirname, '/public/assets/images/favicon.ico')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, max-age=0, must-revalidate, no-store');
  next();
});

// Protect every state-changing form against CSRF and expose the token to views.
app.use(csrf({ cookie: true }));
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

glob
  .sync(__dirname + '/routes/**/*.+(ts|js)')
  .map(filename => require(filename))
  .forEach(route => route.default(app));

setupDev(app, developmentMode);

// Nothing matched — render the friendly not-found page.
app.use((req, res) => {
  res.status(404).render('not-found');
});

// Error handler. Express only treats a middleware as an error handler when it
// declares four parameters, so `next` must be present even though it is unused.
app.use(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  (err: HTTPError & { code?: string }, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err.code === 'EBADCSRFTOKEN') {
      res.status(403).render('error');
      return;
    }
    res.locals.message = err.message;
    res.locals.error = developmentMode ? err : {};
    res.status(err.status || 500);
    res.render('error');
  }
);
