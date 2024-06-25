import type { Adapter, AdapterOptions, Auth, CreateOptions, DeleteOptions, EventCloser, EventHandler, ExecuteOptions, ListOptions, Patch, PatchOptions, UpdateOptions, WatchOptions } from "anykv";

type ResponseStatus = "OK" | "ERR";
type Response<T> = {
  status: ResponseStatus,
  result: T,
  detail?: string,
};

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";


export default class SurrealDBAdapter implements Adapter<"surrealdb"> {
  constructor(private opts: AdapterOptions["surrealdb"]) { }

  async create<T>(key: string, init: Partial<T>, opts?: CreateOptions) {
    const ls = await this.#rpc<T>("POST", key, init, opts?.auth);
    if (!Array.isArray(ls) || ls.length <= 0)
      throw new Error("anykv(create): bad result");
    return ls[0];
  }

  async delete<T>(key: string, opts?: DeleteOptions) {
    return this.#rpc<T>("DELETE", key, undefined, opts?.auth);
  }

  async update<T>(key: string, init: Partial<T>, opts?: UpdateOptions) {
    return this.#rpc<T>("PUT", key, init, opts?.auth);
  }

  async patch<T>(key: string, patches: Patch[], opts?: PatchOptions) {
    return this.#rpc<T>("PATCH", key, patches, opts?.auth);
  }

  async list<T>(key: string, opts?: ListOptions) {
    return this.#rpc<T>("GET", key, undefined, opts?.auth);
  }

  async watch<T>(key: string, h: EventHandler<T>, opts?: WatchOptions): Promise<EventCloser> {
    throw new Error("anykv(watch): not implemented yet");
  }

  async execute<T>(sql: string, vars: Record<string, unknown>, opts?: ExecuteOptions) {
    const params = new URLSearchParams(Object.fromEntries(Object.entries(vars).map(([k, v]) => [
      k, typeof v === "string" ? v : JSON.stringify(v)
    ])));
    const res = await this.#fetch<Response<unknown>[]>("POST", "/sql", params, sql, opts?.auth);
    return res.map(({ status, result, detail }) => {
      if (status === "ERR") throw new Error(`anykv(execute): ${result}`, {
        cause: detail,
      });
      return result;
    }) as T;
  }

  async #rpc<T>(method: Method, thing: string, vars?: unknown, auth?: Auth) {
    const [tab, id] = thing.split(":");
    const path = id ? `/key/${tab}/${id}` : `/key/${tab}`;
    const res = await this.#fetch<Response<T[]>>(method, path, undefined, vars, auth);
    if (res.status === "ERR")
      throw new Error(`anykv(rpc): ${res.result}`, {
        cause: res.detail,
      });
    return res.result;
  }

  async #fetch<T>(method: Method, path: string, params?: URLSearchParams, body?: unknown, auth?: Auth): Promise<T> {
    auth ??= this.opts.auth;
    const headers = new Headers({
      accept: "application/json",
      "content-type": typeof body === "string" ? "text/plain" : "application/json",
      authorization: typeof auth === "string" ? this.#token(auth) : this.#basic(auth),
      ns: this.opts.namespace ?? "anykv",
      db: this.opts.database ?? "anykv"
    });
    const url = new URL(`${path}?${params ?? ""}`, this.opts.url);
    const res = await this.opts.fetch(url, {
      method,
      headers,
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
    if (!res.ok)
      throw new Error("anykv(fetch)", {
        cause: await res.text(),
      });
    return res.json() as T;
  }

  #token(token: string, scheme?: string) {
    scheme ??= "Bearer";
    return `${scheme} ${token}`;
  }

  #basic(auth?: Auth) {
    if (typeof auth !== "object")
      throw new Error("anykv(basic): expected basic auth")
    const tup = `${auth.user}:${auth.pass}`;
    return `Basic ${btoa(tup)}`;
  }
}