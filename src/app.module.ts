import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CoreModule } from './modules/core/core.module';
import { ApiModule } from '@api/api.module';

@Module({
  imports: [ApiModule, CoreModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
