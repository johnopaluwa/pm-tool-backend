import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class CustomizationService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async createFieldDefinition(fieldDefinitionData: {
    name: string;
    type: string;
    entity_type: string;
    options?: any;
  }) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('custom_field_definitions')
      .insert([fieldDefinitionData])
      .select();

    if (error) {
      throw new Error(
        `Error creating custom field definition: ${error.message}`,
      );
    }
    return data ? data[0] : null;
  }

  async getFieldDefinitions(entityType?: string) {
    let query = this.supabaseService
      .getClient()
      .from('custom_field_definitions')
      .select('*');

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    const { data, error } = await query;

    console.log('Data fetched from Supabase:', data); // Add this log

    if (error) {
      throw new Error(
        `Error fetching custom field definitions: ${error.message}`,
      );
    }
    return data;
  }

  async getFieldDefinition(id: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('custom_field_definitions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new Error(
        `Error fetching custom field definition: ${error.message}`,
      );
    }
    return data;
  }

  async updateFieldDefinition(
    id: string,
    updateData: { name?: string; type?: string; options?: any },
  ) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('custom_field_definitions')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      throw new Error(
        `Error updating custom field definition: ${error.message}`,
      );
    }
    return data ? data[0] : null;
  }

  async deleteFieldDefinition(id: string) {
    const { error } = await this.supabaseService
      .getClient()
      .from('custom_field_definitions')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(
        `Error deleting custom field definition: ${error.message}`,
      );
    }
    return { success: true };
  }

  async getFieldValuesForEntity(entityType: string, entityId: string) {
    console.log(
      `Fetching custom field values for entityType: ${entityType}, entityId: ${entityId}`,
    ); // Add logging
    // First, get the IDs of custom field definitions for the organization and entity type
    const { data: fieldDefinitions, error: fieldDefinitionsError } =
      await this.supabaseService
        .getClient()
        .from('custom_field_definitions')
        .select('id')
        .eq('entity_type', entityType);

    if (fieldDefinitionsError) {
      throw new Error(
        `Error fetching custom field definitions for organization: ${fieldDefinitionsError.message}`,
      );
    }

    const fieldIds = fieldDefinitions.map((def: any) => def.id);

    // If there are no custom field definitions for this organization, return an empty array
    if (fieldIds.length === 0) {
      return [];
    }

    // Then, fetch the custom field values for the entity, filtering by the organization's field IDs
    const { data, error } = await this.supabaseService
      .getClient()
      .from('custom_field_values')
      .select(
        `
        *,
        field:field_id (
          name,
          type,
          options
        )
      `,
      )
      .eq('entity_id', entityId)
      .in('field_id', fieldIds); // Use the extracted array of IDs

    if (error) {
      throw new Error(`Error fetching custom field values: ${error.message}`);
    }
    return data;
  }

  async createFieldValue(fieldValueData: {
    field_id: string;
    entity_id: string;
    value?: string; // Make value optional to match DTO
  }) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('custom_field_values')
      .insert([fieldValueData])
      .select();

    if (error) {
      throw new Error(`Error creating custom field value: ${error.message}`);
    }
    return data ? data[0] : null;
  }

  async updateFieldValue(id: string, updateData: { value?: string }) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('custom_field_values')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      throw new Error(`Error updating custom field value: ${error.message}`);
    }
    return data ? data[0] : null;
  }

  async deleteFieldValue(id: string) {
    const { error } = await this.supabaseService
      .getClient()
      .from('custom_field_values')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Error deleting custom field value: ${error.message}`);
    }
    return { success: true };
  }
}
