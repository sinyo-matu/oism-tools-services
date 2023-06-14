import { User } from "https://esm.sh/oism-auth@0.3.8";

const WsConst = {
  HeartBeatAct: "act:heartbeat",
  HeartBeatResp: "resp:heartbeat",
} as const;

const INACTIVE_TIMEOUT = 1000 * 60 * 1;

const STALED_TIMEOUT = 1000 * 60 * 2;

type SessionState = "active" | "inactive" | "staled";

export class Session {
  user: User;
  id: string;
  state: SessionState;
  private ws: WebSocket | null;
  private lastHeartbeat: number;
  private heartbeatInterval: number;

  constructor(id: string, user: User) {
    this.user = user;
    this.id = id;
    this.state = "inactive";
    this.ws = null;
    this.lastHeartbeat = 0;
    this.heartbeatInterval = 0;
  }

  public send(message: string): boolean {
    if (!this.ws) return false;
    this.ws.send(message);
    return true;
  }

  public get isActive(): boolean {
    return this.ws !== null;
  }

  public setHeartbeat() {
    this.lastHeartbeat = Date.now();
  }

  public deactivate() {
    if (this.ws) {
      this.ws.close();
    }
    this.state = "inactive";
    this.ws = null;
  }

  public setToStaled() {
    if (this.ws) {
      this.ws.close();
    }
    this.state = "staled";
    this.ws = null;
  }

  public get shouldSetToIActive(): boolean {
    return this.lastHeartbeat + INACTIVE_TIMEOUT < Date.now();
  }

  public get shouldSetToStaled(): boolean {
    return this.lastHeartbeat + STALED_TIMEOUT < Date.now();
  }

  public setWs(ws: WebSocket) {
    this.ws = ws;
  }

  public close() {
    if (this.ws) {
      this.ws.close();
    }
  }

  public initialize(
    onopen: (ev: Event) => void,
    onmessage: (ev: MessageEvent) => void,
    onclose: (ev: CloseEvent) => void,
    onerror: (ev: Event) => void
  ) {
    this.state = "active";
    const startTime = Date.now();
    if (!this.ws) return;
    this.ws.onopen = (ev) => {
      console.log(
        `session id: ${this.id} username:${this.user.name} is opened`
      );
      this.ws?.send("start time: " + startTime);
      this.ws?.send("your session id: " + this.id);
      this.setHeartbeat();
      this.heartbeatInterval = setInterval(() => {
        this.checkStaled();
        if (this.state === "staled") {
          clearInterval(this.heartbeatInterval);
          this.heartbeatInterval = 0;
          return;
        }
        this.checkInactive();
        if (this.state === "inactive") return;
        if (this.ws) {
          this.ws.send(WsConst.HeartBeatAct);
        }
      }, 1000 * 3);
      onopen(ev);
    };

    this.ws.onmessage = (m) => {
      if (m.data === WsConst.HeartBeatResp) {
        this.setHeartbeat();
        return;
      }
      onmessage(m);
    };

    this.ws.onerror = (e) => {
      this.deactivate();
      console.log(
        `session id: ${this.id} is closed after ${
          (Date.now() - startTime) / 1000
        }s because of ${e}`
      );
      onerror(e);
    };

    this.ws.onclose = (ev) => {
      this.deactivate();
      console.log(
        `session id: ${this.id} is closed after ${
          (Date.now() - startTime) / 1000
        }s`
      );
      onclose(ev);
    };
  }

  private checkStaled() {
    if (this.shouldSetToStaled) {
      this.setToStaled();
      console.log(`session id: ${this.id} is staled`);
    }
  }

  private checkInactive() {
    if (this.shouldSetToIActive) {
      this.deactivate();
    }
  }
}
