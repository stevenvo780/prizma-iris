import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisConfig {
  constructor(private configService: ConfigService) {}

  get host(): string {
    return this.configService.get<string>('REDIS_HOST', 'localhost');
  }

  get port(): number {
    return this.configService.get<number>('REDIS_PORT', 6379);
  }

  get password(): string | undefined {
    return this.configService.get<string>('REDIS_PASSWORD');
  }

  get database(): number {
    return this.configService.get<number>('REDIS_DATABASE', 0);
  }

  get keyPrefix(): string {
    return this.configService.get<string>('REDIS_KEY_PREFIX', 'iris:');
  }

  get maxRetriesPerRequest(): number {
    return this.configService.get<number>('REDIS_MAX_RETRIES', 3);
  }

  get connectTimeout(): number {
    return this.configService.get<number>('REDIS_CONNECT_TIMEOUT', 10000);
  }

  get lazyConnect(): boolean {
    return this.configService.get<boolean>('REDIS_LAZY_CONNECT', true);
  }

  get keepAlive(): number {
    return this.configService.get<number>('REDIS_KEEP_ALIVE', 30000);
  }

  get sessionTtl(): number {
    return this.configService.get<number>('REDIS_SESSION_TTL', 86400);
  }

  get cacheTtl(): number {
    return this.configService.get<number>('REDIS_CACHE_TTL', 3600);
  }

  get queueOptions() {
    return {
      redis: {
        host: this.host,
        port: this.port,
        password: this.password,
        db: this.database,
        keyPrefix: this.keyPrefix,
        maxRetriesPerRequest: this.maxRetriesPerRequest,
        connectTimeout: this.connectTimeout,
        lazyConnect: this.lazyConnect,
        keepAlive: this.keepAlive,
      },
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
      },
    };
  }

  get cacheOptions() {
    return {
      host: this.host,
      port: this.port,
      password: this.password,
      db: this.database,
      keyPrefix: this.keyPrefix + 'cache:',
      maxRetriesPerRequest: this.maxRetriesPerRequest,
      connectTimeout: this.connectTimeout,
      lazyConnect: this.lazyConnect,
      keepAlive: this.keepAlive,
      ttl: this.cacheTtl,
    };
  }

  get sessionOptions() {
    return {
      host: this.host,
      port: this.port,
      password: this.password,
      db: this.database + 1,
      keyPrefix: this.keyPrefix + 'session:',
      maxRetriesPerRequest: this.maxRetriesPerRequest,
      connectTimeout: this.connectTimeout,
      lazyConnect: this.lazyConnect,
      keepAlive: this.keepAlive,
      ttl: this.sessionTtl,
    };
  }

  get rateLimitOptions() {
    return {
      host: this.host,
      port: this.port,
      password: this.password,
      db: this.database + 2,
      keyPrefix: this.keyPrefix + 'ratelimit:',
      maxRetriesPerRequest: this.maxRetriesPerRequest,
      connectTimeout: this.connectTimeout,
      lazyConnect: this.lazyConnect,
      keepAlive: this.keepAlive,
    };
  }

  get healthCheckInterval(): number {
    return this.configService.get<number>('REDIS_HEALTH_CHECK_INTERVAL', 30000);
  }

  get connectionString(): string {
    const auth = this.password ? `:${this.password}@` : '';
    return `redis://${auth}${this.host}:${this.port}/${this.database}`;
  }

  get isClusterMode(): boolean {
    return this.configService.get<boolean>('REDIS_CLUSTER_MODE', false);
  }

  get clusterNodes(): string[] {
    const nodes = this.configService.get<string>('REDIS_CLUSTER_NODES', '');
    return nodes ? nodes.split(',').map(node => node.trim()) : [];
  }
}
