// Helper for handling large datasets in charts
// Implements the "Time Bucket" decimation strategy mentioned in 1Password application

export interface DataPoint {
    timestamp: number;
    value: number;
    [key: string]: any;
}

/**
 * Decimates a large dataset by grouping points into time buckets based on available pixel width.
 * This preserves the visual shape of the data (min/max/avg) while reducing the DOM node count.
 * 
 * @param data Raw high-frequency data
 * @param pixelWidth Approximate width of the chart in pixels (determines bucket count)
 * @param durationMs Total duration of time window
 */
export const decimateData = (
    data: DataPoint[],
    pixelWidth: number = 800
): DataPoint[] => {
    if (data.length <= pixelWidth * 2) return data;

    const startTime = data[0].timestamp;
    const endTime = data[data.length - 1].timestamp;
    const totalDuration = endTime - startTime;
    const bucketSize = totalDuration / pixelWidth;

    const buckets = new Map<number, { sum: number; count: number; max: number; min: number; timestamp: number }>();

    // 1. Single pass aggregation (O(N))
    for (const point of data) {
        const bucketIndex = Math.floor((point.timestamp - startTime) / bucketSize);

        if (!buckets.has(bucketIndex)) {
            buckets.set(bucketIndex, {
                sum: point.value,
                count: 1,
                max: point.value,
                min: point.value,
                timestamp: startTime + (bucketIndex * bucketSize)
            });
        } else {
            const bucket = buckets.get(bucketIndex)!;
            bucket.sum += point.value;
            bucket.count++;
            bucket.max = Math.max(bucket.max, point.value);
            bucket.min = Math.min(bucket.min, point.value);
        }
    }

    // 2. Map back to array (O(W) where W is pixel width)
    // We return the average for trend lines, but you could return max/min for "high/low" charts
    const result: DataPoint[] = [];
    buckets.forEach((bucket) => {
        result.push({
            timestamp: bucket.timestamp,
            value: Number((bucket.sum / bucket.count).toFixed(2)),
            count: bucket.count // preserve obscure stats just in case
        });
    });

    return result.sort((a, b) => a.timestamp - b.timestamp);
};
