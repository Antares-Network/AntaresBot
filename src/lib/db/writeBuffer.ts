import mongoose, { type Model } from "mongoose";
import { safeWarn } from "../log.js";

interface Pending {
  inc: Record<string, number>;
  set: Record<string, unknown>;
  setOnInsert: Record<string, unknown>;
  /** How many flushes this entry has already failed in. */
  attempts: number;
}

/** A write that keeps failing (e.g. a type mismatch on $inc) is dropped after this many tries. */
const MAX_ATTEMPTS = 3;

/** Errors raised before the operation could have reached the server: safe to retry. */
function neverSent(err: unknown): boolean {
  return (
    err instanceof mongoose.mongo.MongoServerSelectionError ||
    err instanceof mongoose.mongo.MongoNotConnectedError ||
    err instanceof mongoose.mongo.MongoTopologyClosedError
  );
}

/**
 * Accumulates per-document writes in memory and flushes them as ONE unordered bulk write,
 * so hot paths (every message, every command, member joins) cost no database round-trip.
 *
 * Guarantees:
 *  - Flushes are serialised: flush() waits for an in-flight flush, so shutdown can't race it.
 *  - Partial failure (MongoBulkWriteError): only the failed operations are re-queued, and
 *    each at most MAX_ATTEMPTS times, so permanent failures don't retry forever. Applied
 *    operations are never re-queued, so increments are never double-counted.
 *  - Ambiguous failure (e.g. a network error after sending): the server may or may not have
 *    applied the batch, so it is dropped and logged rather than risking double-counting.
 *    Failures that provably never reached the server are re-queued.
 *  - forget()/forgetMatching() wait out any in-flight flush and block re-queuing of those
 *    ids, so a deletion (e.g. /remove) can't be undone by a buffered write landing later.
 */
export class WriteBuffer {
  private pending = new Map<string, Pending>();
  private flushing: Promise<number> = Promise.resolve(0);
  private readonly forgotten = new Set<string>();

  public constructor(
    private readonly name: string,
    private readonly model: Model<never>,
    private readonly options: { upsert: boolean },
  ) {}

  public get size(): number {
    return this.pending.size;
  }

  public add(id: string, { inc = {}, set = {}, setOnInsert = {} }: Partial<Omit<Pending, "attempts">>): void {
    const p = this.pending.get(id) ?? { inc: {}, set: {}, setOnInsert: {}, attempts: 0 };
    for (const [k, v] of Object.entries(inc)) p.inc[k] = (p.inc[k] ?? 0) + v;
    Object.assign(p.set, set);
    for (const [k, v] of Object.entries(setOnInsert)) if (!(k in p.setOnInsert)) p.setOnInsert[k] = v;
    this.pending.set(id, p);
  }

  /** Drop everything pending for `id` and wait until no in-flight flush can still write it. */
  public forget(id: string): Promise<void> {
    return this.forgetMatching((k) => k === id);
  }

  /**
   * Like forget(), for every pending id matching `predicate` — including ids that have no
   * document yet (e.g. a member's first buffered counting stat). Call BEFORE deleting.
   */
  public async forgetMatching(predicate: (id: string) => boolean): Promise<void> {
    const ids = [...this.pending.keys()].filter(predicate);
    for (const id of ids) {
      this.forgotten.add(id);
      this.pending.delete(id);
    }
    // A flush already running may hold ids we haven't seen; block those from re-queuing too.
    const guard = predicate;
    this.forgetGuards.add(guard);
    try {
      await this.flushing.catch(() => undefined);
      for (const id of [...this.pending.keys()]) if (predicate(id)) this.pending.delete(id);
    } finally {
      this.forgetGuards.delete(guard);
      for (const id of ids) this.forgotten.delete(id);
    }
  }

  private readonly forgetGuards = new Set<(id: string) => boolean>();

  /** Flush pending writes. Serialised with any flush already running. */
  public flush(): Promise<number> {
    const run = this.flushing.catch(() => 0).then(() => this.flushNow());
    this.flushing = run;
    return run;
  }

  private async flushNow(): Promise<number> {
    if (this.pending.size === 0) return 0;
    const batch = [...this.pending];
    this.pending = new Map();
    const ops = batch.map(([_id, p]) => {
      const update: Record<string, unknown> = {};
      if (Object.keys(p.inc).length) update.$inc = p.inc;
      if (Object.keys(p.set).length) update.$set = p.set;
      if (this.options.upsert) {
        // MongoDB rejects an update touching the same path (or a parent/child of it) in two
        // operators, so drop insert-defaults that $inc/$set already cover.
        const taken = [...Object.keys(p.inc), ...Object.keys(p.set)];
        const clash = (k: string) => taken.some((t) => t === k || t.startsWith(`${k}.`) || k.startsWith(`${t}.`));
        const soi = Object.fromEntries(Object.entries(p.setOnInsert).filter(([k]) => !clash(k)));
        if (Object.keys(soi).length) update.$setOnInsert = soi;
      }
      return { updateOne: { filter: { _id }, update, upsert: this.options.upsert } };
    });

    try {
      await this.model.collection.bulkWrite(ops as never, { ordered: false });
    } catch (err) {
      if (err instanceof mongoose.mongo.MongoBulkWriteError) {
        const failed = new Set([err.writeErrors].flat().map((e) => e.index));
        for (const [i, [id, p]] of batch.entries()) if (failed.has(i)) this.requeue(id, p);
      } else if (neverSent(err)) {
        for (const [id, p] of batch) this.requeue(id, p);
      } else {
        safeWarn(
          `${this.name}: dropped ${batch.length} buffered write(s) after an ambiguous error ` +
            "(the server may already have applied them; retrying could double-count).",
        );
      }
      throw err;
    }
    return batch.length;
  }

  private requeue(id: string, p: Pending) {
    if (this.forgotten.has(id) || [...this.forgetGuards].some((g) => g(id))) return;
    if (p.attempts + 1 >= MAX_ATTEMPTS) {
      safeWarn(`${this.name}: dropped a write for ${id} after ${MAX_ATTEMPTS} failed attempts.`);
      return;
    }
    // Writes that arrived during the failed flush are newer: re-apply them on top.
    const newer = this.pending.get(id);
    this.pending.set(id, { ...p, attempts: p.attempts + 1 });
    if (newer) this.add(id, newer);
  }
}
