import * as path from 'path';

import { formatDateTime } from '../../task/format';
import { statusOptions, statusPresentation } from '../../task/types';

import * as express from 'express';
import * as nunjucks from 'nunjucks';

export class Nunjucks {
  constructor(public developmentMode: boolean) {
    this.developmentMode = developmentMode;
  }

  enableFor(app: express.Express): void {
    app.set('view engine', 'njk');
    const env = nunjucks.configure(path.join(__dirname, '..', '..', 'views'), {
      autoescape: true,
      watch: this.developmentMode,
      express: app,
    });

    env.addFilter('formatDateTime', formatDateTime);
    env.addGlobal('statusPresentation', statusPresentation);
    env.addGlobal('statusOptions', statusOptions);

    app.use((req, res, next) => {
      res.locals.pagePath = req.path;
      next();
    });
  }
}
