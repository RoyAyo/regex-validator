import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
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
      Number(this.configService.get<string>('PROCESSING_DELAY_MS')) || 2000;
    this.logger.log(
      `Job processor initialized with delay: ${this.processingDelay}ms`,
    );
  }

  async onModuleInit() {
    // Subscribe to job validation topic
    this.kafkaClient.subscribeToResponseOf('job.validate');

    // Consume validation requests
    this.kafkaClient
      .createConsumer()
      .subscribe({ topic: 'job.validate' })
      .run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const messageValue = JSON.parse(message.value.toString());
            await this.processJob(messageValue);
          } catch (error) {
            this.logger.error(`Error processing job: ${error.message}`);
          }
        },
      });
  }

  async processJob(job: any): Promise<void> {
    this.logger.log(`Processing job ${job.id} with input: ${job.inputString}`);

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, this.processingDelay));

    try {
      // Validate the string against the regex pattern
      const regex = new RegExp(job.regexPattern);
      const isValid = regex.test(job.inputString);
      const status = isValid ? JobStatus.VALID : JobStatus.INVALID;

      // Update job status
      await this.jobService.updateJobStatus(job.id, status);
      this.logger.log(`Job ${job.id} processed: ${status}`);
    } catch (error) {
      this.logger.error(`Error during job validation: ${error.message}`);
      await this.jobService.updateJobStatus(job.id, JobStatus.INVALID);
    }
  }
}
