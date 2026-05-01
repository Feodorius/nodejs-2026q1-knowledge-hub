export class UsageResponseEntity {
  totalRequests: number;
  requestsByEndpoint: Record<string, number>;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };

  constructor(partial: UsageResponseEntity) {
    Object.assign(this, partial);
  }
}
