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
    const fieldDefinition =
      await this.customizationService.createFieldDefinition({
        ...createFieldDto,
      });
    return fieldDefinition;
  }

  @Get('fields')
  async getFieldDefinitions(@Req() req: any) {
    const fieldDefinitions =
      await this.customizationService.getFieldDefinitions();
    return fieldDefinitions;
  }

  @Get('fields/:id')
  async getFieldDefinition(@Param('id') id: string, @Req() req: any) {
    const fieldDefinition =
      await this.customizationService.getFieldDefinition(id);
    return fieldDefinition;
  }

  @Patch('fields/:id')
  async updateFieldDefinition(
    @Param('id') id: string,
    @Body() updateFieldDto: UpdateCustomFieldDto,
    @Req() req: any,
  ) {
    const updatedField = await this.customizationService.updateFieldDefinition(
      id,
      updateFieldDto,
    );
    return updatedField;
  }

  @Delete('fields/:id')
  async deleteFieldDefinition(@Param('id') id: string, @Req() req: any) {
    await this.customizationService.deleteFieldDefinition(id);
    return { success: true };
  }

  @Get('entities/:entityType/:entityId/fields')
  async getFieldValuesForEntity(
    @Param('entityType') entityType: string, // Although not used in service, useful for context/validation
    @Param('entityId') entityId: string,
    @Req() req: any,
  ) {
    const fieldValues = await this.customizationService.getFieldValuesForEntity(
      entityType,
      entityId,
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
