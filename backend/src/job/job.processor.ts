import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka, EventPattern, Payload } from '@nestjs/microservices';
import { JobService } from './job.service';
import { JobStatus } from './schemas/job.schema';

@Injectable()
export class JobProcessor implements OnModuleInit {
  private readonly logger = new Logger(JobProcessor.name);
  private readonly processingDelay: number;

  constructor(
    @Inject('KAFKA_PRODUCER') private kafkaClient: ClientKafka,
    private configService: ConfigService,
    private jobService: JobService,
  ) {
    this.processingDelay =
      Number(this.configService.get<string>('PROCESSING_DELAY_MS')) || 1000;
    this.logger.log(
      `Job processor initialized with delay: ${this.processingDelay}ms`,
    );
  }

  async onModuleInit() {
    await this.kafkaClient.connect();
    this.logger.log('Connected to Kafka for job.validate consumption');
  }

  @EventPattern('job.validate')
  async handleJob(@Payload() message: any) {
    try {
      const job = message.value;
      this.logger.log(`Received job ${job.id} with input: ${job.inputString}`);
      await this.processJob(job);
    } catch (error) {
      this.logger.error(`Error processing job: ${error.message}`);
    }
  }

  async processJob(job: any): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, this.processingDelay));

    try {
      const regex = new RegExp(job.regexPattern);
      const isValid = regex.test(job.inputString);
      const status = isValid ? JobStatus.VALID : JobStatus.INVALID;

      await this.jobService.updateJobStatus(job.id, status);
      this.logger.log(`Job ${job.id} processed: ${status}`);
    } catch (error) {
      this.logger.error(`Error during job validation: ${error.message}`);
      await this.jobService.updateJobStatus(job.id, JobStatus.INVALID);
    }
  }
}
