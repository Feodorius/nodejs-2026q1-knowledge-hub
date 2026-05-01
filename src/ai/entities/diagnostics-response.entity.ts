import { UsageResponseEntity } from './usage-response.entity';

interface LatencyStat {
  avg: number;
  min: number;
  max: number;
  count: number;
}

interface CacheStat {
  size: number;
  hits: number;
  misses: number;
  hitRatio: number;
}

export class DiagnosticsResponseEntity {
  usage: UsageResponseEntity;
  cache: CacheStat;
  latency: Record<string, LatencyStat>;

  constructor(partial: DiagnosticsResponseEntity) {
    Object.assign(this, partial);
  }
}
