import { Module } from '@nestjs/common';
import { TranslitController } from './translit.controller';

@Module({ controllers: [TranslitController] })
export class TranslitModule {}
