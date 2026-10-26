import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Organization } from '@prisma/client';
import { GetOrgFromRequest } from '@gitroom/nestjs-libraries/user/org.from.request';
import { CheckPolicies } from '@gitroom/backend/services/auth/permissions/permissions.ability';
import {
  AuthorizationActions,
  Sections,
} from '@gitroom/backend/services/auth/permissions/permission.exception.class';
import { StudioService } from '@gitroom/nestjs-libraries/database/prisma/studio/studio.service';
import {
  StudioApprovePostDto,
  StudioAutomationDto,
  StudioContentDto,
  StudioKeyDto,
  StudioScriptDto,
} from '@gitroom/nestjs-libraries/dtos/studio/studio.dto';

@ApiTags('Studio')
@Controller('/studio')
export class StudioController {
  constructor(private _studioService: StudioService) {}

  @Get('/catalog')
  getCatalog() {
    return {
      sources: this._studioService.getSources(),
      videoProviders: this._studioService.getVideoProviders(),
    };
  }

  @Get('/video-providers/:identifier/models')
  getVideoModels(
    @GetOrgFromRequest() org: Organization,
    @Param('identifier') identifier: string
  ) {
    return this._studioService.getVideoModels(org.id, identifier);
  }

  @Get('/keys')
  getKeys(@GetOrgFromRequest() org: Organization) {
    return this._studioService.getKeys(org.id);
  }

  @Post('/keys')
  async saveKey(
    @GetOrgFromRequest() org: Organization,
    @Body() body: StudioKeyDto
  ) {
    await this._studioService.saveKey(org.id, body.provider, body.apiKey);
    return { saved: true };
  }

  @Delete('/keys/:provider')
  async deleteKey(
    @GetOrgFromRequest() org: Organization,
    @Param('provider') provider: string
  ) {
    await this._studioService.deleteKey(org.id, provider);
    return { deleted: true };
  }

  @Get('/automations')
  getAutomations(@GetOrgFromRequest() org: Organization) {
    return this._studioService.getAutomations(org.id);
  }

  @Post('/automations')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  createAutomation(
    @GetOrgFromRequest() org: Organization,
    @Body() body: StudioAutomationDto
  ) {
    return this._studioService.createAutomation(org.id, body);
  }

  @Put('/automations/:id')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  updateAutomation(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: StudioAutomationDto
  ) {
    return this._studioService.createAutomation(org.id, body, id);
  }

  @Post('/automations/:id/active')
  changeActive(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body('active') active: boolean
  ) {
    return this._studioService.changeActive(org.id, id, !!active);
  }

  @Delete('/automations/:id')
  deleteAutomation(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._studioService.deleteAutomation(org.id, id);
  }

  @Get('/trends')
  getTrends(
    @GetOrgFromRequest() org: Organization,
    @Query('automationId') automationId?: string
  ) {
    return this._studioService.getTrends(org.id, automationId);
  }

  @Get('/contents')
  getContents(
    @GetOrgFromRequest() org: Organization,
    @Query('status') status?: string,
    @Query('page') page?: string
  ) {
    return this._studioService.getContents(org.id, status, +(page || 0));
  }

  @Get('/contents/:id')
  getContent(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._studioService.getContent(org.id, id);
  }

  @Post('/contents')
  @CheckPolicies([AuthorizationActions.Create, Sections.AI])
  createContent(
    @GetOrgFromRequest() org: Organization,
    @Body() body: StudioContentDto
  ) {
    return this._studioService.createContent(org.id, body);
  }

  @Put('/contents/:id/script')
  updateScript(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: StudioScriptDto
  ) {
    return this._studioService.updateScript(org.id, id, body.script);
  }

  @Post('/contents/:id/approve-script')
  approveScript(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._studioService.approveScript(org.id, id);
  }

  @Post('/contents/:id/approve-post')
  approvePost(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string,
    @Body() body: StudioApprovePostDto
  ) {
    return this._studioService.approvePost(org.id, id, body.publishDate);
  }

  @Post('/contents/:id/reject')
  rejectContent(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._studioService.rejectContent(org.id, id);
  }

  @Post('/contents/:id/retry')
  retryContent(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._studioService.retryContent(org.id, id);
  }

  @Delete('/contents/:id')
  deleteContent(
    @GetOrgFromRequest() org: Organization,
    @Param('id') id: string
  ) {
    return this._studioService.deleteContent(org.id, id);
  }
}
