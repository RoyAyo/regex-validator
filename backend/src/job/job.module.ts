import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JobController } from './job.controller';
import { JobService } from './job.service';
import { Job, JobSchema } from './schemas/job.schema';
import { JobProcessor } from './job.processor';
import { EventGateway } from './event.gateway';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Job.name, schema: JobSchema }]),
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_PRODUCER',
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'regex-validator',
              brokers: [configService.get<string>('KAFKA_BROKER')],
            },
            producer: {
              allowAutoTopicCreation: true,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
    ClientsModule.register([
      {
        name: 'REDIS_CLIENT',
        transport: Transport.REDIS,
        options: {
          host: process.env.REDIS_HOST || 'redis',
          port: parseInt(process.env.REDIS_PORT) || 6379,
        },
      },
    ]),
  ],
  controllers: [JobController],
  providers: [JobService, JobProcessor, EventGateway],
})
export class JobModule {}