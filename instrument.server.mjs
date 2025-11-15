import * as Sentry from "@sentry/tanstackstart-react";

Sentry.init({
  dsn: "https://d5ab454f12c118842047acd80b00ebd0@o4510370144059392.ingest.us.sentry.io/4510370146811904",

  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});