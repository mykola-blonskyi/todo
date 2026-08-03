import { Injectable } from '@nestjs/common';
import { ListsService } from '../lists/lists.service';
import { HubClientService } from '../hub/hub-client.service';

@Injectable()
export class ListSharesService {
  constructor(
    private readonly listsService: ListsService,
    private readonly hubClientService: HubClientService,
  ) {}

  async searchShareCandidates(ownerId: string, listId: string, q: string) {
    await this.listsService.requireOwned(ownerId, listId);
    return this.hubClientService.searchProjectMembers(q);
  }
}
