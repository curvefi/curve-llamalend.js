class Cache {
    private static instance: Cache;
    readonly cache: Map<string, any>;

    private constructor() {
        this.cache = new Map<string, any>();
    }

    public static getInstance(): Cache {
        if (!Cache.instance) {
            Cache.instance = new Cache();
        }
        return Cache.instance;
    }

    public set(key: string, value: any): void {
        this.cache.set(key, value);
    }

    public get(key: string): any | undefined {
        return this.cache.get(key);
    }

    public has(key: string): boolean {
        return this.cache.has(key);
    }

    public printCache(): void {
        console.log(this.cache)
    }

    public clear(): void {
        this.cache.clear();
    }
}

export const cacheKey = (contractAddress: string, methodName: string, param?: string) => {
    return `${contractAddress}-${methodName}-${param ? param : '|'}`
}

export const cacheStats = Cache.getInstance();
