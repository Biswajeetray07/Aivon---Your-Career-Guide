import { expect, test, describe, beforeAll, afterAll } from 'vitest';
import { Queue, Worker, Job, QueueEvents } from 'bullmq';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const queueName = 'bullmq-audit-queue';

describe('Background Jobs & Asynchronous Queues (BullMQ)', () => {
  let queue: Queue;
  let worker: Worker;
  let queueEvents: QueueEvents;

  beforeAll(() => {
    queue = new Queue(queueName, { connection: { host: 'localhost', port: 6379 } });
    queueEvents = new QueueEvents(queueName, { connection: { host: 'localhost', port: 6379 } });
  });

  afterAll(async () => {
    if (worker) await worker.close();
    if (queueEvents) await queueEvents.close();
    if (queue) await queue.close();
  });

  test('Jobs are successfully enqueued and processed by workers', async () => {
    const payload = { submissionId: 'test_sub_123', language: 'python' };
    
    // Create an isolated worker just for this test
    worker = new Worker(queueName, async (job: Job) => {
      expect(job.data.submissionId).toBe('test_sub_123');
      return { verdict: 'ACCEPTED' };
    }, { connection: { host: 'localhost', port: 6379 } });

    const job = await queue.add('test_judge', payload);
    const result = await job.waitUntilFinished(queueEvents);
    
    expect(result.verdict).toBe('ACCEPTED');
  });

  test('Worker retries with exponential backoff and tracks failure in DLQ (Dead Letter Queue)', async () => {
    let attemptCount = 0;
    
    // Create a worker that always fails
    const failWorker = new Worker(queueName, async () => {
      attemptCount++;
      throw new Error('Simulated Execution Timeout');
    }, { connection: { host: 'localhost', port: 6379 } });

    const failJob = await queue.add('test_fail', {}, { 
      attempts: 3, 
      backoff: { type: 'exponential', delay: 100 } 
    });

    try {
      await failJob.waitUntilFinished(queueEvents);
    } catch (e) {
      // Expected to fail
    }

    // Verify it attempted 3 times before moving to failed state
    expect(attemptCount).toBeGreaterThanOrEqual(3);
    
    const state = await failJob.getState();
    expect(state).toBe('failed');
    
    await failWorker.close();
  }, 10000); // 10s timeout to allow for backoff
});
