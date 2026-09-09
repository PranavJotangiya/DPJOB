import type { Query } from 'firebase-admin/firestore';
import type { Request, Response } from 'express';

type Clients = Set<Response>;

/**
 * Turns one Firestore listener into many Server-Sent Event streams.
 *
 * The browser used to hold its own Firestore `onSnapshot` per collection; now
 * the server holds one per *owner* and fans the result out over SSE, so the app
 * keeps its live-updating feel without any client ever touching Firebase.
 * The last snapshot is cached and replayed to whoever connects next.
 */
export class Broadcaster<T> {
  private clients: Clients = new Set();
  private latest: T[] | null = null;
  private stop: (() => void) | null = null;

  constructor(
    private readonly name: string,
    private readonly query: Query,
    private readonly map: (docs: FirebaseFirestore.QueryDocumentSnapshot[]) => T[],
    /** Called once the last subscriber leaves, so registries can evict us. */
    private readonly onIdle?: () => void,
  ) {}

  /**
   * Current rows. The cache is only trusted while a listener is live to keep it
   * fresh; with no subscribers this reads straight from Firestore.
   */
  async current(): Promise<T[]> {
    if (this.stop && this.latest) return this.latest;
    const rows = this.map((await this.query.get()).docs);
    if (this.stop) this.latest = rows;
    return rows;
  }

  private listen(): void {
    if (this.stop) return;
    this.stop = this.query.onSnapshot(
      (snap) => {
        this.latest = this.map(snap.docs);
        this.push('data', this.latest);
      },
      (err) => {
        console.error(`[stream:${this.name}]`, err);
        this.push('stream-error', { message: err.message });
      },
    );
  }

  /** Drop the Firestore listener once the last subscriber goes away. */
  private idle(): void {
    if (this.clients.size > 0 || !this.stop) return;
    this.stop();
    this.stop = null;
    this.latest = null;
    this.onIdle?.();
  }

  private push(event: string, payload: unknown): void {
    const frame = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const res of this.clients) res.write(frame);
  }

  /** Attaches one SSE client for the lifetime of its request. */
  async subscribe(req: Request, res: Response): Promise<void> {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write(': connected\n\n');
    res.flushHeaders?.();

    this.clients.add(res);
    this.listen();

    try {
      res.write(`event: data\ndata: ${JSON.stringify(await this.current())}\n\n`);
    } catch (err) {
      console.error(`[stream:${this.name}] initial read failed`, err);
      res.write(`event: stream-error\ndata: ${JSON.stringify({ message: 'read failed' })}\n\n`);
    }

    // Proxies and mobile networks drop a silent connection; this keeps it warm.
    const ping = setInterval(() => res.write(': ping\n\n'), 25_000);

    req.on('close', () => {
      clearInterval(ping);
      this.clients.delete(res);
      this.idle();
      res.end();
    });
  }
}

/**
 * One Broadcaster per signed-in user, built on demand.
 *
 * Every collection is owner-scoped, so a shared listener would hand one user
 * another user's rows. Each owner gets their own filtered query, and their
 * listener is dropped as soon as they disconnect.
 */
export class OwnerStreams<T> {
  private byOwner = new Map<string, Broadcaster<T>>();

  constructor(
    private readonly name: string,
    private readonly queryFor: (owner: string) => Query,
    private readonly map: (docs: FirebaseFirestore.QueryDocumentSnapshot[]) => T[],
  ) {}

  for(owner: string): Broadcaster<T> {
    let stream = this.byOwner.get(owner);
    if (!stream) {
      stream = new Broadcaster<T>(
        `${this.name}:${owner}`,
        this.queryFor(owner),
        this.map,
        () => this.byOwner.delete(owner),
      );
      this.byOwner.set(owner, stream);
    }
    return stream;
  }
}
