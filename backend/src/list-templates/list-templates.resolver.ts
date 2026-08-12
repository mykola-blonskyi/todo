import {
  Args,
  ID,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { ListTemplate } from './list-template.model';
import { ListTemplatesService } from './list-templates.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/user.model';
import { CurrentUser } from '../identity/current-user.decorator';
import type { Identity } from '../identity/identity.types';
import { ListTemplateRecurrenceType } from '@prisma/client';
import { ShareCandidateInput } from '../list-shares/share-candidate.input';
import { ShareCandidate } from '../list-shares/share-candidate.model';

@Resolver(() => ListTemplate)
export class ListTemplatesResolver {
  constructor(
    private readonly listTemplatesService: ListTemplatesService,
    private readonly usersService: UsersService,
  ) {}

  @ResolveField(() => [User])
  collaborators(@Parent() template: ListTemplate) {
    return this.listTemplatesService.templateCollaborators(template.id);
  }

  @Query(() => [ListTemplate])
  async myListTemplates(@CurrentUser() identity: Identity) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.listTemplatesService.myListTemplates(user.id);
  }

  @Query(() => ListTemplate)
  async listTemplate(
    @CurrentUser() identity: Identity,
    @Args('id', { type: () => ID }) id: string,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.listTemplatesService.listTemplate(user.id, id);
  }

  @Query(() => [ShareCandidate])
  async searchTemplateCandidates(
    @CurrentUser() identity: Identity,
    @Args('templateId', { type: () => ID }) templateId: string,
    @Args('q', { type: () => String }) q: string,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.listTemplatesService.searchTemplateCandidates(
      user.id,
      templateId,
      q,
    );
  }

  @Mutation(() => ListTemplate)
  async createListTemplate(
    @CurrentUser() identity: Identity,
    @Args('title') title: string,
    @Args('taskTitles', { type: () => [String] }) taskTitles: string[],
    @Args('recurrenceType', { type: () => ListTemplateRecurrenceType })
    recurrenceType: ListTemplateRecurrenceType,
    @Args('timezone') timezone: string,
    @Args('weekDays', { type: () => [Int], nullable: true })
    weekDays?: number[],
    @Args('dayOfMonth', { type: () => Int, nullable: true })
    dayOfMonth?: number,
    @Args('intervalDays', { type: () => Int, nullable: true })
    intervalDays?: number,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.listTemplatesService.createListTemplate(user.id, {
      title,
      taskTitles,
      recurrenceType,
      timezone,
      weekDays,
      dayOfMonth,
      intervalDays,
    });
  }

  @Mutation(() => ListTemplate)
  async updateListTemplate(
    @CurrentUser() identity: Identity,
    @Args('id', { type: () => ID }) id: string,
    @Args('title', { nullable: true }) title?: string,
    @Args('taskTitles', { type: () => [String], nullable: true })
    taskTitles?: string[],
    @Args('recurrenceType', {
      type: () => ListTemplateRecurrenceType,
      nullable: true,
    })
    recurrenceType?: ListTemplateRecurrenceType,
    @Args('weekDays', { type: () => [Int], nullable: true })
    weekDays?: number[],
    @Args('dayOfMonth', { type: () => Int, nullable: true })
    dayOfMonth?: number,
    @Args('intervalDays', { type: () => Int, nullable: true })
    intervalDays?: number,
    @Args('timezone', { nullable: true }) timezone?: string,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.listTemplatesService.updateListTemplate(user.id, id, {
      title,
      taskTitles,
      recurrenceType,
      weekDays,
      dayOfMonth,
      intervalDays,
      timezone,
    });
  }

  @Mutation(() => ListTemplate)
  async pauseListTemplate(
    @CurrentUser() identity: Identity,
    @Args('id', { type: () => ID }) id: string,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.listTemplatesService.pauseListTemplate(user.id, id);
  }

  @Mutation(() => ListTemplate)
  async resumeListTemplate(
    @CurrentUser() identity: Identity,
    @Args('id', { type: () => ID }) id: string,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.listTemplatesService.resumeListTemplate(user.id, id);
  }

  @Mutation(() => Boolean)
  async deleteListTemplate(
    @CurrentUser() identity: Identity,
    @Args('id', { type: () => ID }) id: string,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.listTemplatesService.deleteListTemplate(user.id, id);
  }

  @Mutation(() => User)
  async addTemplateCollaborator(
    @CurrentUser() identity: Identity,
    @Args('templateId', { type: () => ID }) templateId: string,
    @Args('candidate', { type: () => ShareCandidateInput })
    candidate: ShareCandidateInput,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.listTemplatesService.addTemplateCollaborator(
      user.id,
      templateId,
      candidate,
    );
  }

  @Mutation(() => Boolean)
  async removeTemplateCollaborator(
    @CurrentUser() identity: Identity,
    @Args('templateId', { type: () => ID }) templateId: string,
    @Args('targetUserId', { type: () => ID }) targetUserId: string,
  ) {
    const user = await this.usersService.findOrCreateByIdentity(identity);
    return this.listTemplatesService.removeTemplateCollaborator(
      user.id,
      templateId,
      targetUserId,
    );
  }
}
