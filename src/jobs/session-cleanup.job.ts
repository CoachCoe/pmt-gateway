import * as cron from 'node-cron';
import { sessionService } from '@/services/session.service';
import logger from '@/utils/logger';

export class SessionCleanupJob {
  private isRunning = false;
  private cronJob: cron.ScheduledTask | null = null;

  start(): void {
    if (this.isRunning) {
      logger.warn('Session cleanup job is already running');
      return;
    }

    // Run every hour
    this.cronJob = cron.schedule('0 * * * *', async () => {
      await this.runCleanup();
    });

    this.cronJob.start();
    this.isRunning = true;

    logger.info('Session cleanup job started - running every hour');
  }

  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    logger.info('Session cleanup job stopped');
  }

  private async runCleanup(): Promise<void> {
    try {
      logger.info('Starting session cleanup job');
      
      const statsBefore = await sessionService.getSessionStats();
      logger.info('Session stats before cleanup', statsBefore);

      const cleanedCount = await sessionService.cleanupExpiredSessions();
      
      const statsAfter = await sessionService.getSessionStats();
      logger.info('Session cleanup completed', {
        cleanedCount,
        statsBefore,
        statsAfter,
      });
    } catch (error) {
      logger.error('Session cleanup job failed:', error);
    }
  }

  async runOnce(): Promise<void> {
    await this.runCleanup();
  }

  isActive(): boolean {
    return this.isRunning;
  }
}

export const sessionCleanupJob = new SessionCleanupJob();
