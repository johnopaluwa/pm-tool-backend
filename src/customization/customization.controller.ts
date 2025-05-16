import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post, // Assuming you have an AuthGuard
  Req,
} from '@nestjs/common';
import { CustomizationService } from './customization.service';
import { CreateCustomFieldValueDto } from './dto/create-custom-field-value.dto';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { UpdateCustomFieldValueDto } from './dto/update-custom-field-value.dto';
import { UpdateCustomFieldDto } from './dto/update-custom-field.dto';
// import { JwtAuthGuard } from '../auth/jwt-auth.guard'; // Assuming you have an AuthGuard

@Controller('customization')
// @UseGuards(JwtAuthGuard) // Protect these endpoints
export class CustomizationController {
  constructor(private readonly customizationService: CustomizationService) {}

  @Post('fields')
  async createFieldDefinition(
    @Body() createFieldDto: CreateCustomFieldDto,
    @Req() req: any,
  ) {
    // TODO: Extract organizationId from request (e.g., from user object attached by AuthGuard)
    const organizationId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // Placeholder UUID for testing

    const fieldDefinition =
      await this.customizationService.createFieldDefinition({
        ...createFieldDto,
        organization_id: organizationId,
      });
    return fieldDefinition;
  }

  @Get('fields')
  async getFieldDefinitions(@Req() req: any) {
    // TODO: Extract organizationId from request
    const organizationId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // Placeholder
    const fieldDefinitions =
      await this.customizationService.getFieldDefinitions(organizationId);
    return fieldDefinitions;
  }

  @Get('fields/:id')
  async getFieldDefinition(@Param('id') id: string, @Req() req: any) {
    // TODO: Extract organizationId from request
    const organizationId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // Placeholder
    const fieldDefinition = await this.customizationService.getFieldDefinition(
      id,
      organizationId,
    );
    return fieldDefinition;
  }

  @Patch('fields/:id')
  async updateFieldDefinition(
    @Param('id') id: string,
    @Body() updateFieldDto: UpdateCustomFieldDto,
    @Req() req: any,
  ) {
    // TODO: Extract organizationId from request
    const organizationId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // Placeholder
    const updatedField = await this.customizationService.updateFieldDefinition(
      id,
      organizationId,
      updateFieldDto,
    );
    return updatedField;
  }

  @Delete('fields/:id')
  async deleteFieldDefinition(@Param('id') id: string, @Req() req: any) {
    // TODO: Extract organizationId from request
    const organizationId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // Placeholder
    await this.customizationService.deleteFieldDefinition(id, organizationId);
    return { success: true };
  }

  @Get('entities/:entityType/:entityId/fields')
  async getFieldValuesForEntity(
    @Param('entityType') entityType: string, // Although not used in service, useful for context/validation
    @Param('entityId') entityId: string,
    @Req() req: any,
  ) {
    // TODO: Extract organizationId from request
    const organizationId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // Placeholder
    const fieldValues = await this.customizationService.getFieldValuesForEntity(
      entityId,
      organizationId,
    );
    return fieldValues;
  }

  @Post('values')
  async createFieldValue(
    @Body() createFieldValueDto: CreateCustomFieldValueDto,
  ) {
    // TODO: Add validation/checks to ensure the field_id belongs to a field definition
    // within the user's organization before creating the value.
    const fieldValue =
      await this.customizationService.createFieldValue(createFieldValueDto);
    return fieldValue;
  }

  @Patch('values/:id')
  async updateFieldValue(
    @Param('id') id: string,
    @Body() updateFieldValueDto: UpdateCustomFieldValueDto,
  ) {
    // TODO: Add validation/checks to ensure the field value belongs to a field definition
    // within the user's organization before updating.
    const updatedValue = await this.customizationService.updateFieldValue(
      id,
      updateFieldValueDto,
    );
    return updatedValue;
  }

  @Delete('values/:id')
  async deleteFieldValue(@Param('id') id: string) {
    // TODO: Add validation/checks to ensure the field value belongs to a field definition
    // within the user's organization before deleting.
    await this.customizationService.deleteFieldValue(id);
    return { success: true };
  }
}
