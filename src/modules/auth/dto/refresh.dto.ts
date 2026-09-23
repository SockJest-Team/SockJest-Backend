import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class RefreshDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  refresh_token: string;
}