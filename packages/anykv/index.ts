type Adapters = keyof AdapterOptions;

type AdapterOptions = {
  sqlite: SQLiteOptions,
  surrealdb: SurrealDBOptions,
  redis: RedisOptions,
}

type SQLiteOptions = OpenOptions & {
  path: string,
  wal?: boolean,
};

type SurrealDBOptions = OpenOptions & {
  url: URL | string,
  fetch: typeof fetch,
};

type RedisOptions = OpenOptions & {
  host: string,
  port: number,
  password: string,
};

type OpenOptions = {
  namespace?: string,
  database?: string,
  readonly?: boolean,
  auth?: Auth,
};

type OperationOptions = {
  auth?: Auth,
  query?: URLSearchParams,
  order?: string,
  desc?: boolean,
};

export type Auth = string | { user: string, pass: string };

export type ListOptions = OperationOptions & {};

export type CreateOptions = Omit<OperationOptions, "query" | "order" | "desc"> & {};

export type DeleteOptions = OperationOptions & {};

export type UpdateOptions = OperationOptions & {};

export type PatchOptions = OperationOptions & {};

export type ExecuteOptions = OperationOptions;

export type WatchOptions = OperationOptions;

export type Patch = {
  op: (string & {}) | "set" | "del" | "incr" | "decr",
  key: string,
  value: unknown,
};

export type Event<T> = {
  op: "create" | "update" | "delete",
  key: string,
  values: T[],
};

export type EventHandler<T> = (e: Event<T>) => Promise<void>;

export interface Adapter<T extends Adapters> extends Operations<T> {
  new(opts: Options<T>): Adapter<T>
};

export type Options<T extends Adapters> = AdapterOptions[T];

export interface Operations<T extends Adapters> {
  create<T>(key: string, init: Partial<T>, opts?: CreateOptions): Promise<T>
  update<T>(key: string, init: Partial<T>, opts?: UpdateOptions): Promise<T[]>
  delete<T>(key: string, opts?: DeleteOptions): Promise<T[]>
  list<T>(key: string, opts?: ListOptions): Promise<T[]>
  patch<T>(key: string, patches: Patch[], opts?: PatchOptions): Promise<T[]>
  watch<T>(key: string, handler: EventHandler<T>, opts?: WatchOptions): Promise<void>
  execute<T>(sql: string, vars: Record<string, unknown>, opts?: ExecuteOptions): Promise<T>
};

export class AnyKV<T extends Adapters> implements Operations<T> {
  #adapter: Adapter<T>
  constructor(private name: T, private opts: Options<T>) {
    const adapter_type = dynamic_import_sync(this.name);
    this.#adapter = new adapter_type(opts);
  }

  async create<T>(key: string, init: Partial<T>, opts?: CreateOptions): Promise<T> {
    return this.#adapter.create(key, init, opts);
  }

  async update<T>(key: string, init: Partial<T>, opts?: UpdateOptions): Promise<T[]> {
    return this.#adapter.update(key, init, opts);
  }

  async delete<T>(key: string, opts?: DeleteOptions): Promise<T[]> {
    return this.#adapter.delete(key, opts);
  }

  async list<T>(key: string, opts?: ListOptions): Promise<T[]> {
    return this.#adapter.list(key, opts);
  }

  async patch<T>(key: string, patches: Patch[], opts?: OperationOptions): Promise<T[]> {
    return this.#adapter.patch(key, patches, opts);
  }

  async watch<T>(key: string, handler: EventHandler<T>, opts?: OperationOptions): Promise<void> {
    return this.#adapter.watch(key, handler, opts);
  }

  async execute<T>(sql: string, vars: Record<string, unknown>, opts?: OperationOptions): Promise<T> {
    return this.#adapter.execute(sql, vars, opts);
  }
  /**
   * GET /keys
   * GET /keys/{key}
   * 
   */
  fetch(req: Request) {

  }
}

function dynamic_import_sync<T extends Adapters>(id: T): Adapter<T> {
  const names = {
    "sqlite": "@anykv/adapter-sqlite",
    "surrealdb": "@anykv/adapter-surrealdb",
    "redis": "@anykv/adapter-redis",
  };

  if (!(id in names)) {
    throw new Error(`Adapter "${id}" not supported`);
  }

  const name = names[id]
  try {
    return require(name).default;
  } catch {
    throw new Error(
      `Module "${name}" not found. Install it using one of

  bun add ${name}
  npm install ${name}
`
    );
  }
}

export const version = "0.0.1"
