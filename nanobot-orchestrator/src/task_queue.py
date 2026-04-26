"""Task queue using Redis."""
import json
import logging
from typing import Dict, Any, Optional

import redis

from src.config import settings

logger = logging.getLogger(__name__)


class TaskQueue:
    """Simple Redis-based task queue."""
    
    def __init__(self):
        self.redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
        self.queue_key = "nanobot:issue_queue"
    
    def enqueue(self, task: Dict[str, Any]) -> bool:
        """Add a task to the queue."""
        try:
            self.redis_client.lpush(self.queue_key, json.dumps(task))
            logger.info(f"Task enqueued: {task.get('task_type')}")
            return True
        except Exception as e:
            logger.error(f"Failed to enqueue task: {e}")
            return False
    
    def dequeue(self, timeout: int = 5) -> Optional[Dict[str, Any]]:
        """Get a task from the queue."""
        try:
            result = self.redis_client.brpop(self.queue_key, timeout=timeout)
            if result:
                _, task_json = result
                return json.loads(task_json)
            return None
        except Exception as e:
            logger.error(f"Failed to dequeue task: {e}")
            return None
    
    def get_length(self) -> int:
        """Get queue length."""
        return self.redis_client.llen(self.queue_key)
