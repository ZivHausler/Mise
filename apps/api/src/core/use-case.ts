export interface UseCase<TResult, TArgs extends unknown[] = []> {
  execute(...args: TArgs): Promise<TResult>;
}
