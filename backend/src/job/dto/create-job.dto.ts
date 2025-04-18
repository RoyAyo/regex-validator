import { IsString, IsNotEmpty } from 'class-validator';

export class CreateJobDto {
  @IsString()
  @IsNotEmpty()
  inputString: string;
}