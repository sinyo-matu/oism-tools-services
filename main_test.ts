import { assertEquals } from "https://deno.land/std@0.178.0/testing/asserts.ts";
import ky from "https://esm.sh/ky@0.33.2";
Deno.test("db update", async () => {
  const url = "http://localhost:8080/db_update";
  const body = { message: "test" };
  const headers = { "Content-Type": "application/json" };
  const response = await ky.post(url, { json: body, headers });
  assertEquals(response.status, 200);
  response.text();
});

Deno.test("ws ticket", async () => {
  const url = "http://localhost:8080/ws_ticket";
  const response = await ky.get(url);
  assertEquals(response.status, 200);
  response.text();
});

Deno.test("hello world", async () => {
  const url = "http://localhost:8080";
  const response = await ky.get(url);
  assertEquals(response.status, 200);
  response.text();
});
