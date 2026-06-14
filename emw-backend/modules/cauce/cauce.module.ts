import { Global, Module } from '@nestjs/common';
import { OlympoHubService } from './cauce-hub.service';

/**
 * OlympoModule — capa de integración con el ecosistema Olympo.
 * Global para que cualquier servicio de EMW pueda inyectar OlympoHubService
 * sin tener que importar el módulo explícitamente.
 */
@Global()
@Module({
  providers: [OlympoHubService],
  exports: [OlympoHubService],
})
export class OlympoModule {}
