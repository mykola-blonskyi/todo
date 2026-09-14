import { registerEnumType } from '@nestjs/graphql';

export enum TaskMoveDirection {
  up = 'up',
  down = 'down',
}

registerEnumType(TaskMoveDirection, { name: 'TaskMoveDirection' });
