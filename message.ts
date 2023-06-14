import {
  connect,
  Redis,
  RedisSubscription,
} from "https://deno.land/x/redis@v0.29.2/mod.ts";

export class MessageHandler {
  private redis: Redis;
  private readonly topicName: string = "dbUpdate";
  private subscription: RedisSubscription<string> | undefined;
  private lastReceivedTime: number = Date.now();

  constructor(client: Redis) {
    this.redis = client;
    this.subscription = undefined;
  }

  static async createNew() {
    return new MessageHandler(
      await connect({
        hostname: Deno.env.get("REDIS_HOSTNAME") || "localhost",
        port: Deno.env.get("REDIS_PORT") || 6379,
        username: Deno.env.get("REDIS_USERNAME") || "redis",
        password: Deno.env.get("REDIS_PASSWORD") || "",
        tls: Deno.env.get("REDIS_HOSTNAME") ? false : true,
      })
    );
  }

  public ping() {
    return this.redis?.ping();
  }

  public async subscribe(handler: (message: string) => Promise<void> | void) {
    const sub = await this.redis?.subscribe(this.topicName);
    this.subscription = sub;
    for await (const { channel, message } of sub.receive()) {
      console.log("Message from channel", channel, ":", message);
      const receivedTime = Date.now();
      if (receivedTime - this.lastReceivedTime < 10) continue;
      this.lastReceivedTime = receivedTime;
      await handler(message);
    }
  }

  public async cleanUp() {
    if (this.subscription) {
      await this.subscription.unsubscribe(this.topicName);
      this.subscription.close();
    }
  }
}
