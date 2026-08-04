'use strict';

module.exports = Object.assign(
  {},
  require('./user-onboarding'),
  require('./tenant-domain-config'),
  require('./ops-leads-domain'),
  require('./cobros-reconciliation-domain'),
  require('./index'),
  require('./bank-accounts')
);
