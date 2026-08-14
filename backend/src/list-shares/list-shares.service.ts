import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ListsService } from '../lists/lists.service';
import { UsersService } from '../users/users.service';
import { ListShareStatus } from '@prisma/client';
import { ShareCandidateInput } from './share-candidate.input';
import { HubClientService } from '../hub/hub-client.service';
import { CalendarSyncService } from '../google-calendar/calendar-sync.service';

@Injectable()
export class ListSharesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly listsService: ListsService,
    private readonly usersService: UsersService,
    private readonly hubClientService: HubClientService,
    private readonly calendarSyncService: CalendarSyncService,
  ) {}

  async searchShareCandidates(
    ownerId: string,
    listId: string,
    q: string,
    sessionCookie: string,
  ) {
    await this.listsService.requireOwned(ownerId, listId);
    return this.hubClientService.searchProjectMembers(q, sessionCookie);
  }

  async invite(
    ownerId: string,
    listId: string,
    candidate: ShareCandidateInput,
  ) {
    await this.listsService.requireOwned(ownerId, listId);

    const invitee = await this.usersService.findOrCreateCandidate({
      hubUserId: candidate.hubUserId,
      email: candidate.email,
      name: candidate.name ?? undefined,
      image: candidate.image ?? undefined,
    });

    const existing = await this.prisma.listShare.findUnique({
      where: {
        listId_userId: { listId, userId: invitee.id },
      },
    });

    if (existing?.status === ListShareStatus.accepted) {
      return existing;
    }

    return this.prisma.listShare.upsert({
      where: { listId_userId: { listId, userId: invitee.id } },
      update: { status: ListShareStatus.pending, respondedAt: null },
      create: { listId, userId: invitee.id, status: ListShareStatus.pending },
    });
  }

  async pendingInvites(userId: string) {
    return this.prisma.listShare.findMany({
      where: { userId, status: ListShareStatus.pending },
    });
  }

  async acceptInvite(userId: string, shareId: string) {
    await this.requirePendingInvite(userId, shareId);

    return this.prisma.listShare.update({
      where: { id: shareId },
      data: { status: ListShareStatus.accepted, respondedAt: new Date() },
    });
  }

  async declineInvite(userId: string, shareId: string) {
    await this.requirePendingInvite(userId, shareId);

    return this.prisma.listShare.update({
      where: { id: shareId },
      data: { status: ListShareStatus.declined, respondedAt: new Date() },
    });
  }

  async removeCollaborator(
    ownerId: string,
    listId: string,
    targetUserId: string,
  ) {
    await this.listsService.requireOwned(ownerId, listId);

    const listShare = await this.prisma.listShare.findUnique({
      where: {
        listId_userId: {
          listId,
          userId: targetUserId,
        },
      },
    });

    if (!listShare) {
      throw new NotFoundException('Collaborator not found');
    }

    await this.prisma.listShare.delete({
      where: { listId_userId: { userId: targetUserId, listId } },
    });
    // Best-effort, after the share is gone - other users' synced events are
    // untouched (business-rules.md Rule 10).
    await this.calendarSyncService.deleteCalendarEventForUser(
      targetUserId,
      listId,
    );

    return true;
  }

  async leaveList(userId: string, listId: string) {
    const listShare = await this.prisma.listShare.findUnique({
      where: {
        listId_userId: {
          listId,
          userId,
        },
      },
    });

    if (!listShare) {
      throw new NotFoundException('Not a collaborator on this list');
    }

    await this.prisma.listShare.delete({
      where: {
        listId_userId: {
          userId,
          listId,
        },
      },
    });
    await this.calendarSyncService.deleteCalendarEventForUser(userId, listId);

    return true;
  }

  private async requirePendingInvite(userId: string, shareId: string) {
    const listShare = await this.prisma.listShare.findUnique({
      where: { id: shareId },
    });

    if (listShare?.userId !== userId) {
      throw new NotFoundException('Invite not found');
    }

    if (listShare.status !== ListShareStatus.pending) {
      throw new ConflictException('Invitation already accepted or declined');
    }
  }
}
