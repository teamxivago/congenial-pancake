import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsDefined,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { studioKeys } from '@gitroom/nestjs-libraries/studio/studio.keys';

export class StudioSourceDto {
  @IsString()
  @IsDefined()
  identifier: string;

  @IsObject()
  @IsOptional()
  settings: Record<string, string>;
}

class StudioVideoOptionsDto {
  @IsIn(['cheap', 'ai', 'none'])
  videoMode: 'cheap' | 'ai' | 'none';

  @IsString()
  @IsOptional()
  videoProvider?: string;

  @IsObject()
  @IsOptional()
  videoSettings: Record<string, any>;

  @IsIn(['vertical', 'horizontal'])
  output: 'vertical' | 'horizontal';

  @IsArray()
  @IsString({ each: true })
  integrations: string[];

  @IsBoolean()
  approveScript: boolean;

  @IsBoolean()
  approvePost: boolean;
}

export class StudioAutomationDto extends StudioVideoOptionsDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(200)
  niche: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  keywords: string;

  @IsString()
  language: string;

  @IsString()
  region: string;

  @IsArray()
  @ArrayMaxSize(10)
  @Type(() => StudioSourceDto)
  @ValidateNested({ each: true })
  sources: StudioSourceDto[];

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  instructions?: string;

  @IsInt()
  @Min(1)
  @Max(168)
  intervalHours: number;

  @IsInt()
  @Min(1)
  @Max(20)
  maxPerDay: number;

  @IsBoolean()
  active: boolean;
}

export class StudioContentDto extends StudioVideoOptionsDto {
  @IsString()
  @MaxLength(5000)
  topic: string;

  @IsString()
  @IsOptional()
  trendId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  niche?: string;

  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  instructions?: string;
}

export class StudioKeyDto {
  @IsIn(studioKeys.map((p) => p.identifier))
  provider: string;

  @IsString()
  @MaxLength(2000)
  apiKey: string;
}

export class StudioScriptDto {
  @IsObject()
  script: Record<string, any>;
}

export class StudioApprovePostDto {
  @IsDateString()
  @IsOptional()
  publishDate?: string;
}
