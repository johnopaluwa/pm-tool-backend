import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { CustomizationController } from './customization.controller';
import { CustomizationService } from './customization.service';

@Module({
  imports: [SupabaseModule],
  controllers: [CustomizationController],
  providers: [CustomizationService],
  exports: [CustomizationService], // Export if other modules need to use it
})
export class CustomizationModule {}
