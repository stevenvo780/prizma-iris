import { Global, Module } from '@nestjs/common';
import { PrizmaHubService } from './prizma-hub.service';

/**
 * PrizmaModule — capa de integración con el ecosistema Prizma.
 * Global para que cualquier servicio de Iris pueda inyectar PrizmaHubService
 * sin tener que importar el módulo explícitamente.
 */
@Global()
@Module({
  providers: [PrizmaHubService],
  exports: [PrizmaHubService],
})
export class PrizmaModule {}
