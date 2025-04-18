import { Controller, Get, Post, Body, Logger } from '@nestjs/common';
import { JobService } from './job.service';
import { CreateJobDto } from './dto/create-job.dto';
import { Job } from './schemas/job.schema';

@Controller('jobs')
export class JobController {
  private readonly logger = new Logger(JobController.name);

  constructor(private readonly jobService: JobService) {}

  @Post()
  async create(@Body() createJobDto: CreateJobDto): Promise<Job> {
    this.logger.log(`Creating new job with input: ${createJobDto.inputString}`);
    return this.jobService.create(createJobDto);
  }

  @Get()
  async findAll(): Promise<Job[]> {
    this.logger.log('Retrieving all jobs');
    return this.jobService.findAll();
  }
}
