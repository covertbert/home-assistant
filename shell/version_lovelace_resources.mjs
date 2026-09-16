#!/usr/bin/env node

const { HA_TOKEN, HA_URL, HA_VERSION } = process.env;

if (!HA_TOKEN || !HA_URL || !HA_VERSION) {
  throw new Error("HA_TOKEN, HA_URL and HA_VERSION are required");
}

const socketUrl = `${HA_URL.replace(/^http/, "ws")}/api/websocket`;
const ws = new WebSocket(socketUrl);
let nextId = 1;
const pending = new Map();

const send = (message) => ws.send(JSON.stringify(message));
const command = (type, data = {}) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    send({ id, type, ...data });
  });

const fail = (error) => {
  for (const { reject } of pending.values()) reject(error);
  pending.clear();
  ws.close();
  throw error;
};

ws.addEventListener("message", async ({ data }) => {
  const message = JSON.parse(data);

  if (message.type === "auth_required") {
    send({ type: "auth", access_token: HA_TOKEN });
    return;
  }

  if (message.type === "auth_invalid") {
    fail(new Error(`Home Assistant WebSocket auth failed: ${message.message}`));
    return;
  }

  if (message.type === "auth_ok") {
    try {
      const resources = await command("lovelace/resources/list");
      const localResources = (resources || []).filter(({ url }) =>
        url?.startsWith("/local/"),
      );
      let updated = 0;

      for (const resource of localResources) {
        const url = `${resource.url.split("?")[0]}?v=${HA_VERSION}`;
        if (resource.url === url) continue;
        await command("lovelace/resources/update", {
          resource_id: resource.id,
          url,
          res_type: resource.type,
        });
        updated++;
      }

      console.log(
        `Lovelace resources: ${localResources.length} local, ${updated} versioned`,
      );
      setTimeout(() => ws.close(), 12000);
    } catch (error) {
      fail(error);
    }
    return;
  }

  if (message.type === "result") {
    const request = pending.get(message.id);
    if (!request) return;
    pending.delete(message.id);
    if (message.success) request.resolve(message.result);
    else
      request.reject(
        new Error(
          `Home Assistant WebSocket command failed: ${JSON.stringify(message.error)}`,
        ),
      );
  }
});

ws.addEventListener("error", () =>
  fail(new Error("Home Assistant WebSocket connection failed")),
);
ws.addEventListener("close", () => {
  if (pending.size)
    fail(new Error("Home Assistant WebSocket closed before completion"));
});
