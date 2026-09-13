import { Injectable } from '@nestjs/common';

export interface DomainEvent { name: string }
type Handler<T extends DomainEvent> = (event: T) => Promise<void> | void;

@Injectable()
export class DomainEventBus {
  private readonly handlers = new Map<string, Handler<DomainEvent>[]>();

  subscribe<T extends DomainEvent>(name: T['name'], handler: Handler<T>) {
    const handlers = this.handlers.get(name) ?? [];
    handlers.push(handler as Handler<DomainEvent>);
    this.handlers.set(name, handlers);
  }

  async publish<T extends DomainEvent>(event: T) {
    await Promise.all((this.handlers.get(event.name) ?? []).map((handler) => handler(event)));
  }
}
