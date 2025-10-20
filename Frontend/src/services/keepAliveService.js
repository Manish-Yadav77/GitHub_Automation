/**
 * Keep-Alive Service
 * 
 * This service periodically pings the backend to prevent it from going to sleep
 * on platforms like Render.com (free tier) that shut down inactive instances.
 * 
 * This ensures cron jobs continue running 24/7 for automated commits.
 */

import axios from 'axios';

class KeepAliveService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.pingInterval = 10 * 60 * 1000; // Ping every 10 minutes
    this.apiUrl = import.meta.env.VITE_API_URL || 'https://github-automation-8d48.onrender.com';
  }

  /**
   * Start the keep-alive service
   * Sends periodic pings to the backend to keep it alive
   */
  start() {
    if (this.isRunning) {
      console.warn('⚠️  Keep-alive service is already running');
      return;
    }

    this.isRunning = true;
    console.log('🔄 Keep-alive service started - pinging backend every 10 minutes');

    // Send first ping immediately
    this.ping();

    // Set up interval to ping periodically
    this.intervalId = setInterval(() => {
      this.ping();
    }, this.pingInterval);
  }

  /**
   * Stop the keep-alive service
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('🛑 Keep-alive service stopped');
  }

  /**
   * Send a ping to the backend
   */
  async ping() {
    try {
      const timestamp = new Date().toLocaleTimeString();
      const response = await axios.get(`${this.apiUrl}/api/ping`, {
        timeout: 5000
      });

      console.log(`✅ [${timestamp}] Keep-alive ping successful - Backend is active`);
      return response.data;
    } catch (error) {
      console.warn(`⚠️  Keep-alive ping failed:`, error.message);
      // Don't stop on error, just log it
    }
  }

  /**
   * Check backend health status
   */
  async checkHealth() {
    try {
      const response = await axios.get(`${this.apiUrl}/api/health/detailed`, {
        timeout: 5000
      });

      console.log('✅ Backend health check:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Backend health check failed:', error.message);
      return null;
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      pingInterval: this.pingInterval,
      lastPing: this.lastPingTime,
      apiUrl: this.apiUrl
    };
  }
}

// Export singleton instance
export default new KeepAliveService();