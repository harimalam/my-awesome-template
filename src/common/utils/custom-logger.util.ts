import { ConsoleLogger } from '@nestjs/common';

export class CustomLogger extends ConsoleLogger {
  constructor(context: string) {
    super(context);
  }

  log(message: any) {
    const color = '\x1b[36m'; // Cyan
    const reset = '\x1b[0m';

    const formattedMessage = `${color}${message}${reset}`;

    super.log(formattedMessage, this.context);
  }
}
