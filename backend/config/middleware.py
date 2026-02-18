import logging
import time

logger = logging.getLogger(__name__)

class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        client_ip = request.META.get('REMOTE_ADDR')
        logger.info(f"--- New Client Connected: {client_ip} ---")
        logger.info(f"Request: {request.method} {request.path}")
        
        start_time = time.time()
        response = self.get_response(request)
        duration = time.time() - start_time
        
        logger.info(f"Response: {response.status_code} (took {duration:.2f}s)")
        return response
