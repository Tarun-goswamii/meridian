import { autumnHandler } from "autumn-js/backend";
import { createFileRoute } from '@tanstack/react-router'

// Shared handler function for all HTTP methods
async function handleAutumnRequest(request: Request) {
  // TODO: Replace with real authentication logic as needed.
  const customerId = "user_id_or_org_id"; // put logic here

  let body = null;
  if (request.method !== "GET") {
    try {
      body = await request.json();
    } catch {
      body = null;
    }
  }

  const { statusCode, response } = await autumnHandler({
    customerId,
    customerData: { name: "", email: "" }, // customize as needed
    request: {
      url: request.url,
      method: request.method,
      body: body,
    },
  });

  return new Response(JSON.stringify(response), {
    status: statusCode,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute('/api/autumn/$')({
  server: {
    handlers: {
      GET: async ({ request }) => handleAutumnRequest(request),
      POST: async ({ request }) => handleAutumnRequest(request),
      PUT: async ({ request }) => handleAutumnRequest(request),
      DELETE: async ({ request }) => handleAutumnRequest(request),
      PATCH: async ({ request }) => handleAutumnRequest(request),
      OPTIONS: async ({ request }) => handleAutumnRequest(request),
    },
  },
})

