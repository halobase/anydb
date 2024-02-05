import type { Adapter, Options } from "anykv";
import { Database } from "bun:sqlite";

export default class SQLiteAdapter<A extends "sqlite"> implements Adapter<A> {
  #db: Database
  constructor(private opts: Options<A>) {
    this.#db = new Database(opts.path, opts);
    if (opts.path != ":memory:" && opts.wal) {
      this.#db.run("PRAGMA journal_mode = WAL;");
    }
  }
  
}
