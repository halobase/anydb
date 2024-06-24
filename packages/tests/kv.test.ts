import { AnyKV } from "anykv";
import { test, expect } from "bun:test";

type User = {
  id: string,
  name: string,
  emails: string[],
};

test("sqlite", async () => {
  const kv = new AnyKV("sqlite", { path: ":memory:" });

  const u0 = await kv.create<User>("user", {
    name: "Leo X.",
    emails: ["x@le0.me"]
  });

  const ls = await kv.list<User>(`user:${u0.id}`);

  expect(ls).toBeArray();
  expect(ls.length).toBe(1);
  expect(ls[0]).toEqual(u0);
});
