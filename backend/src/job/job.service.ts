import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import { ClientKafka } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { Job, JobStatus } from './schemas/job.schema';
import { CreateJobDto } from './dto/create-job.dto';
import { EventGateway } from './event.gateway';

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);
  private readonly regexPattern: string;

  constructor(
    @Inject('KAFKA_PRODUCER') private kafkaClient: ClientKafka,
    @InjectRedis() private readonly redis: Redis,
    private configService: ConfigService,
    private eventGateway: EventGateway,
  ) {
    this.regexPattern =
      this.configService.get<string>('REGEX_PATTERN') || '^[a-zA-Z0-9]+$';
    this.logger.log(`Using regex pattern: ${this.regexPattern}`);
  }

  async onModuleInit() {
    this.kafkaClient.subscribeToResponseOf('job.validate');
    await this.kafkaClient.connect();
  }

  private async _createJobCache(jobDetails: Job): Promise<void> {
    await this.redis.hset(
      'jobs_cache',
      jobDetails.jobId,
      JSON.stringify(jobDetails),
    );
  }

  async createJobStatus(createJobDto: CreateJobDto): Promise<Job> {

    const jobId = new Date().getTime().toString();
    
    const jobDetails = {
      jobId,
      inputString: createJobDto.inputString,
      regexPattern: this.regexPattern,
      status: JobStatus.VALIDATING,
    };

    await this._createJobCache(jobDetails);
    
    this.logger.log(`Job created with ID: ${jobId}`);
    this.eventGateway.notifyJobUpdate(jobDetails);

    // Send job to Kafka for processing
    this.kafkaClient.emit('job.validate', {
      id: jobId,
      inputString: jobDetails.inputString,
      regexPattern: jobDetails.regexPattern,
    });

    return jobDetails;
  }

  async findAll(): Promise<Record<string, string>[]> {
    const jobs = await this.redis.hgetall('jobs_cache');
    return Object.entries(jobs).map(([id, value]) => ({
      id,
      data: JSON.parse(value),
    }));
  }
}
