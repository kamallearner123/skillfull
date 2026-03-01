from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import requests
import json

@csrf_exempt
def ai_assistant_query(request):
	if request.method == 'POST':
		data = json.loads(request.body)
		query = data.get('query', '')
		# Forward query to backend smartguide_proxy API
		try:
			smartguide_proxy_url = 'http://localhost:8000/api/smartguide/ai-assistant/query'  # Update port if needed
			sg_response = requests.post(smartguide_proxy_url, json={'query': query})
			sg_data = sg_response.json()
			return JsonResponse({'response': sg_data.get('response', 'No response')})
		except Exception as e:
			return JsonResponse({'response': f'Error: {str(e)}'}, status=500)
	return JsonResponse({'response': 'Invalid request'}, status=400)
