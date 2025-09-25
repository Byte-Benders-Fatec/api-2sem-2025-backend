/* eslint-disable no-unused-vars */
import {
  EventSubscriber, EntitySubscriberInterface, InsertEvent, RemoveEvent, UpdateEvent
} from "typeorm";
import { SoftRemoveEvent } from "typeorm/subscriber/event/SoftRemoveEvent";
import Metadata from '../Metadata';

@EventSubscriber()
class MetadataSubscriber implements EntitySubscriberInterface<Metadata> {
  listenTo(): string | Function {
    return Metadata;
  }

  async beforeInsert(event: InsertEvent<Metadata>): Promise<any> {
    const now = new Date();
    event.entity.createdAt = now;
    event.entity.updatedAt = now;
  }

  async beforeUpdate(event: UpdateEvent<Metadata>): Promise<any> {
    delete event.entity.id;
    delete event.entity.createdAt;
    delete event.entity.deletedAt;
    event.entity.updatedAt = new Date();
  }

  async beforeSoftRemove(event: SoftRemoveEvent<Metadata>): Promise<any> {
    event.entity.deletedAt = new Date();
  }

  async beforeRemove(event: RemoveEvent<Metadata>): Promise<any> {
    throw new Error("hard delete is not allowed try soft delete instead");
  }
}

export default MetadataSubscriber;