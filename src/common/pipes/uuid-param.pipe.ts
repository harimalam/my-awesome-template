import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { validate as isUuid } from 'uuid';

@Injectable()
export class UuidParamPipe implements PipeTransform<string> {
  transform(value: string) {
    if (!isUuid(value)) {
      throw new BadRequestException('Invalid UUID format');
    }
    return value;
  }
}
