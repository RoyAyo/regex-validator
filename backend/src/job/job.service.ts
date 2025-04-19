import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ClientKafka } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { Job, JobDocument, JobStatus } from './schemas/job.schema';
import { CreateJobDto } from './dto/create-job.dto';
import { EventGateway } from './event.gateway';

@Injectable()
export class JobService {
  private readonly logger = new Logger(JobService.name);
  private readonly regexPattern: string;
  private readonly processingDelay: number;

  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @Inject('KAFKA_PRODUCER') private kafkaClient: ClientKafka,
    private configService: ConfigService,
    private eventGateway: EventGateway,
  ) {
    this.regexPattern = this.configService.get<string>('REGEX_PATTERN') || '^[a-zA-Z0-9]+$';
    this.processingDelay =
      Number(this.configService.get<string>('PROCESSING_DELAY_MS')) || 500;
    this.logger.log(`Using regex pattern: ${this.regexPattern}`);
  }

  async onModuleInit() {
    await this.kafkaClient.connect();
  }

  private async _processJob(job: any): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, this.processingDelay));
    console.log('Processing job:', job);
    try {
      const regex = new RegExp(job.regexPattern);
      const isValid = regex.test(job.inputString);
      const status = isValid ? JobStatus.VALID : JobStatus.INVALID;

      await this.updateJobStatus(job.id, status);
      this.logger.log(`Job ${job.id} processed: ${status}`);
    } catch (error) {
      this.logger.error(`Error during job validation: ${error.message}`);
      await this.updateJobStatus(job.id, JobStatus.INVALID);
    }
  }

  async create(createJobDto: CreateJobDto): Promise<Job> {
    const createdJob = new this.jobModel({
      inputString: createJobDto.inputString,
      regexPattern: this.regexPattern,
      status: JobStatus.VALIDATING,
    });
    
    const savedJob = await createdJob.save();
    this.logger.log(`Job created with ID: ${savedJob._id}`);
    
    this.kafkaClient.emit('job.validate', {
      id: savedJob._id.toString(),
      inputString: savedJob.inputString,
      regexPattern: savedJob.regexPattern,
    });
    
    this._processJob(savedJob);
    this.eventGateway.notifyJobUpdate(savedJob);
    
    return savedJob;
  }

  async updateJobStatus(jobId: string, status: JobStatus): Promise<Job> {
    const updatedJob = await this.jobModel.findByIdAndUpdate(
      jobId,
      { status },
      { new: true },
    );
    
    if (updatedJob) {
      this.logger.log(`Job ${jobId} updated to status: ${status}`);
      this.eventGateway.notifyJobUpdate(updatedJob);
    }
    
    return updatedJob;
  }

  async findAll(): Promise<Job[]> {
    return this.jobModel.find().sort({ createdAt: -1 }).exec();
  }
}