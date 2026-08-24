import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
export declare class NotificationsGateway {
    private readonly notificationsService;
    constructor(notificationsService: NotificationsService);
    create(createNotificationDto: CreateNotificationDto): string;
    findAll(): string;
    findOne(id: number): string;
    update(updateNotificationDto: UpdateNotificationDto): string;
    remove(id: number): string;
}
