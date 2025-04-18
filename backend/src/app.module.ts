import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RedisModule, RedisModuleOptions } from '@nestjs-modules/ioredis';
import { JobModule } from './job/job.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): RedisModuleOptions => {
        const host = configService.get<string>('REDIS_HOST');
        const port = configService.get<number>('REDIS_PORT');
        const password = configService.get<string>('REDIS_PASSWORD');
        
        const url = `redis://${password ? `:${password}@` : ''}${host}:${port}`;
        
        return {
          type: 'single',
          url
        };
      },
    }),
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_SERVICE',
        imports: [ConfigModule],
        useFactory: async (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'regex-validator',
              brokers: [configService.get<string>('KAFKA_BROKER')],
            },
            consumer: {
              groupId: 'regex-validator-consumer',
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
    JobModule,
  ],
})
export class AppModule {}