import * as path from 'path';

import {NestFactory} from '@nestjs/core';
import {MicroserviceOptions, Transport} from '@nestjs/microservices';

import {AppModule} from './app.module';
import {protobufPackage} from './protogen/account';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.GRPC,
      options: {
        // eslint-disable-next-line no-process-env
        url: process.env.CONNECTION_URL,
        package: [protobufPackage],
        protoPath: [path.join(process.cwd(), 'proto/account.proto')],
      },
    },
  );
  await app.listen();
}

bootstrap();
