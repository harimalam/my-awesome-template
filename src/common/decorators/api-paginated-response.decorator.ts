import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { PaginatedResponseDto } from '../dtos/paginated-response.dto';

interface PaginatedDecoratorOptions<DataModel extends Type<any>, MetaModel extends Type<any>> {
  model: DataModel;
  metaModel: MetaModel;
  description?: string;
}

export const ApiPaginatedResponse = <DataModel extends Type<any>, MetaModel extends Type<any>>(
  options: PaginatedDecoratorOptions<DataModel, MetaModel>,
) => {
  return applyDecorators(
    // 1. Tell Swagger to track the Wrapper, the Data DTO, and the Meta DTO globally
    ApiExtraModels(PaginatedResponseDto, options.model, options.metaModel),

    // 2. Dynamically stitch the JSON Schema together
    ApiOkResponse({
      description: options.description || 'Successfully retrieved paginated data.',
      schema: {
        allOf: [
          { $ref: getSchemaPath(PaginatedResponseDto) },
          {
            properties: {
              data: {
                type: 'array',
                items: { $ref: getSchemaPath(options.model) },
              },
              meta: {
                $ref: getSchemaPath(options.metaModel), // Inject the specific Meta DTO here
              },
            },
          },
        ],
      },
    }),
  );
};
