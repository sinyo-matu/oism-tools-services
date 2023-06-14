import { User } from "https://esm.sh/oism-auth@0.3.8";
import { Session } from "./Session.ts";

export class SessionsManager {
  #sessions: Map<string, Session>;

  constructor() {
    this.#sessions = new Map();
    setInterval(() => {
      this.cleanUpStaledSessions();
    }, 1000 * 60 * 5);
  }

  public issueSession(user: User): string {
    const id = Math.random().toString(36).slice(2);
    const session = new Session(id, user);
    this.#sessions.set(id, session);
    return id;
  }

  public activateSession(
    sessionId: string,
    ws: WebSocket,
    messageHandler?: (message: string, id: string) => void | Promise<void>
  ): boolean {
    const session = this.#sessions.get(sessionId);
    if (!session) return false;
    session.setWs(ws);
    this.initializeWs(session, (m) => {
      if (messageHandler) {
        return messageHandler(m, sessionId);
      }
    });
    return true;
  }

  private cleanUpStaledSessions() {
    this.#sessions.forEach((session) => {
      if (session.state === "staled") {
        console.log(`clean up staled session: ${session.id}`);
        this.cleanUpSession(session);
      }
    });
  }

  public sendMsgTo(sessionId: string, message: string): boolean {
    const session = this.#sessions.get(sessionId);
    if (!session) return false;
    const ok = session.send(message);
    return ok;
  }

  public sendMsgToAll(message: string) {
    this.#sessions.forEach((session) => {
      console.log("send message to: " + session.id + "message: " + message);
      session.send(message);
    });
  }

  public sendMsgToAllExcept(sessionIds: string[], message: string) {
    this.#sessions.forEach((session, id) => {
      if (!sessionIds.includes(id)) {
        session.send(message);
      }
    });
  }

  public closeAll() {
    this.#sessions.forEach((session) => {
      session.close();
    });
  }

  private cleanUpSession(session: Session) {
    if (session.isActive) {
      session.deactivate();
    }
    this.#sessions.delete(session.id);
  }

  private initializeWs(
    session: Session,
    messageHandler?: (message: string) => void | Promise<void>
  ) {
    const onopen = () => {
      this.logUserSessionStatus(session.user);
    };

    const onmessage = async (m: MessageEvent) => {
      if (messageHandler) {
        await messageHandler(m.data.toString());
      }
    };

    const onerror = () => {};

    const onclose = () => {
      this.logUserSessionStatus(session.user);
    };

    session.initialize(onopen, onmessage, onclose, onerror);
  }

  private logUserSessionStatus(user: User) {
    const count = Array.from(this.#sessions.values()).filter(
      (session) => session.user.exId === user.exId && session.isActive
    ).length;
    console.log(`user ${user.name} has ${count} active session(s)`);
    if (count === 0) {
      console.log(`user ${user.name} is offline`);
    }
  }
}
