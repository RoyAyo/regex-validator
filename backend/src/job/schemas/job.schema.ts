import { IsEnum, IsNotEmpty, IsString } from "class-validator";

export enum JobStatus {
  VALIDATING = 'Validating',
  VALID = 'Valid',
  INVALID = 'Invalid',
}

export class Job {
  @IsString()
  @IsNotEmpty()
  jobId: string;

  @IsString()
  @IsNotEmpty()
  inputString: string;

  @IsString()
  regexPattern: string;

  @IsEnum(JobStatus)
  status: JobStatus;
}