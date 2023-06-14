import { User } from "https://esm.sh/oism-auth@0.3.8";
import { SessionsManager } from "./SessionsManager.ts";

export class WsHandler {
  private manager: SessionsManager;

  constructor() {
    this.manager = new SessionsManager();
  }

  /**
   * issue a ticket for user.
   * a ticket is for individual session with a user's device.
   * so user can have multiple tickets.
   * @param user user info
   * @returns session id aka ticket
   */
  public acquireTicket(user: User): string {
    return this.manager.issueSession(user);
  }

  public activateTicket(
    ticket: string,
    ws: WebSocket,
    messageHandler?: (
      message: string,
      id: string,
      wsHandler: WsHandler
    ) => void | Promise<void>
  ) {
    return this.manager.activateSession(
      ticket,
      ws,
      (message: string, sessionId: string) => {
        if (messageHandler) {
          return messageHandler(message, sessionId, this);
        }
      }
    );
  }

  public broadcast(message: string) {
    this.manager.sendMsgToAll(message);
  }

  public broadcastExcept(sessionIds: string[], message: string) {
    this.manager.sendMsgToAllExcept(sessionIds, message);
  }

  public sendTo(sessionId: string, message: string) {
    return this.manager.sendMsgTo(sessionId, message);
  }

  public cleanUp() {
    this.manager.closeAll();
  }
}
